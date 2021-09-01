import { NextApiRequest, NextApiResponse } from 'next'
import pMap from 'p-map'
import { chunk, flatten, orderBy } from 'lodash'
import { utils as etherUtils, BigNumber } from 'ethers'
import type { OpenseaResponse, Asset } from '../../../utils/openseaTypes'
import RobeIDs from '../../../data/robes-ids.json'
import CrownData from '../../../data/crown-data.json'
import { itemRarity, rarityImage, RarityLevel, rarityLevels } from 'loot-rarity'

const chunked = chunk(RobeIDs, 20)
const apiKey = process.env.OPENSEA_API_KEY

type RarityData = {
  raritySVG: string;
  rarityLevel: RarityLevel;
  crown: string;
}

const rarityCache: Map<string,RarityData> = new Map<string, RarityData>()

const fetchRobePage = async (ids: string[]) => {
  let url = 'https://api.opensea.io/api/v1/assets?collection=lootproject&'
  url += ids.map((id) => `token_ids=${id}`).join('&')

  const res = await fetch(url, {
    headers: {
      // 'X-API-KEY': apiKey,
    },
  })
  const json: OpenseaResponse = await res.json()
  return json.assets
}

export interface RobeInfo {
  id: string
  price: Number
  url: string
  svg: string
  rarity?: RarityData
}

export const fetchRobes = async () => {
  const data = await pMap(chunked, fetchRobePage, { concurrency: 2 })
  const mapped = flatten(data)
    .filter((d) => {
      return (
        d.sell_orders &&
        d.sell_orders.length > 0 &&
        d.sell_orders[0].payment_token_contract.symbol == 'ETH'
      )
    })
    .map((a: Asset): RobeInfo => {
      return {
        id: a.token_id,
        price: Number(
          etherUtils.formatUnits(
            BigNumber.from(a.sell_orders[0].current_price.split('.')[0]),
          ),
        ),
        url: a.permalink + '?ref=0xfb843f8c4992efdb6b42349c35f025ca55742d33',
        svg: a.image_url,
      }
    })
  const withRarity = await pMap(mapped, enrichWithRarity, { concurrency: 2 })
  return {
    robes: orderBy(withRarity, ['price', 'id'], ['asc', 'asc']),
    lastUpdate: new Date().toISOString(),
  }
}

const enrichWithRarity = async (r: RobeInfo): Promise<RobeInfo> => {
    try {
      if (rarityCache.has(r.id)) {
        const rarity = rarityCache.get(r.id)
        return {
          ...r,
          rarity
        }
      }
      const res = await fetch(r.svg)
      const data = await res.text()
      const raritySVG = await rarityImage(data, {displayLevels: true})
      const crown = CrownData[r.id];
      const level = itemRarity(crown) || 1;

      const rarity: RarityData = {
        rarityLevel: level,
        raritySVG,
        crown
      }
      rarityCache.set(r.id, rarity)
      return {
        ...r,
        rarity
      }
    } catch (e) {
      return r
    }
}

const handler = async (_req: NextApiRequest, res: NextApiResponse) => {
  try {
    const data = await fetchRobes()
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ statusCode: 500, message: err.message })
  }
}

export default handler
