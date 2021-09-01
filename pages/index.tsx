import { RobeInfo, fetchRobes } from './api/robes'
import { format as ts } from 'timeago.js'
import { rarityDescription, RarityLevel } from 'loot-rarity'
import { useState } from 'react'

export async function getStaticProps() {
  const data = await fetchRobes()
  return {
    props: {
      robes: data.robes,
      lastUpdate: data.lastUpdate,
    },
    revalidate: 300,
  }
}

interface Props {
  robes: RobeInfo[]
  lastUpdate: string
}

const rarities: RarityLevel[] = [1, 2, 3, 4, 5, 6]

const Robe = ({ robe }: { robe: RobeInfo }) => {
  return (
    <a href={robe.url} target="_blank">
      <div className="m-auto pb-4 mb-8 flex flex-col justify-center items-center gap-2 p-4 md:m-4 border border-white transform hover:scale-105 transition-all bg-black w-full md:w-96">
        {robe.rarity?.raritySVG ? (
          <img src={robe.rarity.raritySVG} />
        ) : (
          <img src={robe.svg} />
        )}
        <div className="text-center">
          <p className="text-lg">#{robe.id}</p>
          <p>{robe.price} ETH</p>
        </div>
      </div>
    </a>
  )
}

const strToRarity = (val: string): RarityLevel | 0 => {
  if (Number(val) == 0) {
    return 0
  }
  return Number(val) as RarityLevel
}

const filterByRarity = (robes: RobeInfo[], rarity: RarityLevel | 0) => {
  if (rarity == 0) {
    return robes
  }
  return robes.filter((r) => r.rarity?.rarityLevel === rarity)
}

const IndexPage = ({ robes, lastUpdate }: Props) => {
  const [rarity, setRarity] = useState<RarityLevel | 0>(0)

  const onChangeRarityFilter = (event) => {
    const rarity = strToRarity(event.target.value)
    setRarity(rarity)
  }

  const filtered = filterByRarity(robes, rarity)
  const description = rarity == 0 ? '' : rarityDescription(rarity)
  const prep = /[aeiou]/.test(description.toLowerCase()[0]) ? 'an' : 'a'

  return (
    <div className="py-3 md:pb-0 font-mono flex flex-col justify-center items-center gap-4 pt-10 md:w-screen">
      <h1 className="text-lg md:text-3xl">Crowns</h1>
      <div className="text-center max-w-screen-md md:leading-loose">
        <p className="md:text-xl">
          There are {filtered.length} bags for sale with {prep} {description}{' '}
          Crown. The floor price is{' '}
          {filtered.length > 0 ? filtered[0].price : 'N/A'} ETH.
        </p>
        <p className="md:text-lg pt-2">
          Original site by{' '}
          <a
            target="_blank"
            href="https://twitter.com/worm_emoji"
            className="underline"
          >
            worm_emoji
          </a>
          . Forked for CrownDAO.
        </p>
        <p className="text-sm mv-4">Last updated {ts(lastUpdate)}</p>
      </div>
      <div className="flex">
        <p className="mr-4">Filter by crown rarity:</p>
        <select
          className="bg-transparent"
          onChange={onChangeRarityFilter}
          value={rarity}
        >
          <option value={0}>All</option>
          {rarities.map((level) => {
            return (
              <option key={level} value={level}>
                {rarityDescription(level)}
              </option>
            )
          })}
        </select>
      </div>
      <div className="grid md:grid-cols-2 pt-5">
        {filtered.map((robe) => {
          return <Robe robe={robe} key={robe.id} />
        })}
      </div>
    </div>
  )
}

export default IndexPage
