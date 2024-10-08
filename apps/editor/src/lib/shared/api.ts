import { generateChecksum } from '@allmaps/id'
import { fetchJson } from '@allmaps/stdlib'

import type { Source } from '$lib/shared/types.js'

import { PUBLIC_ALLMAPS_API_URL } from '$env/static/public'

export async function fetchMaps(source: Source) {
  const url = `${PUBLIC_ALLMAPS_API_URL}/${source.type}s/${source.allmapsId}/maps`
  return await fetchJson(url)
}

export async function checkSource(source: Source) {
  const url = `${PUBLIC_ALLMAPS_API_URL}/${source.type}s/${source.allmapsId}`
  return await fetchJson(url)
}

export async function createSource(source: Source) {
  const checksum = await generateChecksum(source.sourceIiif)

  const apiUrl = `${PUBLIC_ALLMAPS_API_URL}/${source.type}s/${source.allmapsId}`

  const apiData = {
    url: source.url,
    checksum
  }

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify(apiData)
  })

  return await response.json()
}
