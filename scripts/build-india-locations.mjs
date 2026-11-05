/**
 * Builds lib/data/india-locations.json (state → district → sub-district) for the hotel form's
 * location dropdowns, from the Local Government Directory (lgdirectory.gov.in) as republished
 * daily in Parquet at https://ramseraph.github.io/opendata/lgd/ (see data/metadata.json there).
 *
 *   1. Download states / districts / subdistricts .parquet (URLs in metadata.json) into one folder
 *   2. npm i --no-save hyparquet hyparquet-compressors
 *   3. node scripts/build-india-locations.mjs <folder> <observed-on date, e.g. 2026-10-27>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parquetReadObjects } from 'hyparquet'
import { compressors } from 'hyparquet-compressors'

const [dir, observedOn, outPath = new URL('../lib/data/india-locations.json', import.meta.url)] = process.argv.slice(2)
if (!dir || !observedOn) {
  console.error('Usage: node scripts/build-india-locations.mjs <folder with the .parquet files> <observed-on date>')
  process.exit(1)
}

async function read(name) {
  const buf = readFileSync(join(dir, `${name}.parquet`))
  return parquetReadObjects({ file: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), compressors })
}

// Spellings our hotels, search and guests use where LGD's official name differs. Hotel search
// matches the stored city text, so these must agree with what guests type.
const PREFERRED_NAMES = { Honavar: 'Honnavar' }

// "Jammu And Kashmir" → "Jammu and Kashmir"; tidy spaces
const clean = (name) => {
  const tidy = String(name).replace(/\s+/g, ' ').trim().replace(/ And /g, ' and ').replace(/ Of /g, ' of ')
  return PREFERRED_NAMES[tidy] ?? tidy
}
const byName = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })

const [states, districts, subdistricts] = await Promise.all([read('states'), read('districts'), read('subdistricts')])

const subsByDistrict = new Map()
for (const s of subdistricts) {
  const list = subsByDistrict.get(String(s.district_code)) ?? new Set()
  list.add(clean(s.subdistrict_name))
  subsByDistrict.set(String(s.district_code), list)
}

const districtsByState = new Map()
for (const d of districts) {
  const list = districtsByState.get(String(d.state_code)) ?? []
  list.push([clean(d.district_name), [...(subsByDistrict.get(String(d.district_code)) ?? [])].sort(byName)])
  districtsByState.set(String(d.state_code), list)
}

const out = {
  source: 'Local Government Directory (lgdirectory.gov.in), via https://ramseraph.github.io/opendata/lgd/',
  observedOn,
  states: states
    .map((s) => ({
      name: clean(s.state_name),
      ut: s.state_or_ut === 'U',
      districts: (districtsByState.get(String(s.state_code)) ?? []).sort((a, b) => byName(a[0], b[0])),
    }))
    .sort((a, b) => byName(a.name, b.name)),
}

writeFileSync(outPath, JSON.stringify(out) + '\n')
const districtCount = out.states.reduce((n, s) => n + s.districts.length, 0)
const subCount = out.states.reduce((n, s) => n + s.districts.reduce((m, d) => m + d[1].length, 0), 0)
console.log(`${out.states.length} states/UTs, ${districtCount} districts, ${subCount} sub-districts`)
