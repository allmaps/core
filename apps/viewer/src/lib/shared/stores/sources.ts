import { writable, derived } from 'svelte/store'

import { generateId } from '@allmaps/id'
import { fetchJson, fetchAnnotationsFromApi } from '@allmaps/stdlib'

import {
  addAnnotation,
  removeAnnotation,
  resetMaps
} from '$lib/shared/stores/maps.js'
import {
  mapVectorSource,
  mapWarpedMapLayer
} from '$lib/shared/stores/openlayers.js'
import { resetTransformation } from '$lib/shared/stores/transformation.js'

import { parseJson } from '$lib/shared/parser.js'

import type {
  Source,
  UrlSourceOptions,
  StringSourceOptions
} from '$lib/shared/types.js'

type Sources = Map<string, Source>

const sourcesStore = writable<Sources>(new Map())

export const sourceLoading = writable<boolean>(false)

async function addSource(
  id: string,
  json: unknown,
  options: UrlSourceOptions | StringSourceOptions
) {
  sourceLoading.set(true)

  let annotations: unknown[] = []

  const parsed = await parseJson(json)
  if (parsed.type === 'annotation') {
    annotations = [json]
  } else {
    if (parsed.iiif.type === 'collection') {
      await parsed.iiif.fetchAll({
        fetchManifests: true,
        fetchImages: false
      })
    }

    annotations = await fetchAnnotationsFromApi(parsed.iiif)
  }

  const mapIds = []

  for (const annotation of annotations) {
    mapIds.push(...(await addAnnotation(id, annotation)))
  }

  sourcesStore.update((sources) => {
    const source: Source = {
      id,
      json,
      parsed,
      annotations,
      ...options
    }

    sources.set(id, source)
    return sources
  })

  sourceLoading.set(false)

  return mapIds
}

export async function addUrlSource(url: string) {
  const json = await fetchJson(url)

  // TODO: or get id field from json?
  const id = await generateId(url)

  return await addSource(id, json, {
    sourceType: 'url',
    url
  })
}

export async function addStringSource(string: string) {
  const json = JSON.parse(string)

  // TODO: or get id field from json?
  const id = await generateId(string)

  return await addSource(id, json, {
    sourceType: 'string',
    string
  })
}

export function removeSource(id: string) {
  sourcesStore.update((sources) => {
    sources.delete(id)
    return sources
  })

  removeAnnotation(id)
}

export function resetSources() {
  mapWarpedMapLayer.clear()
  mapVectorSource.clear()

  resetTransformation()
  sourcesStore.set(new Map())
  resetMaps()
}

export const sourceIds = derived(sourcesStore, ($sources) => $sources.keys())

export const sourcesCount = derived(sourcesStore, ($sources) => $sources.size)

export const sourcesById = { subscribe: sourcesStore.subscribe }

export const sources = derived(sourcesStore, ($sources) => $sources.values())

export const firstSource = derived(sources, ($sources) => [...$sources][0])
