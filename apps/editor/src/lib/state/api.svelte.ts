import { setContext, getContext } from 'svelte'

import { parseAnnotation, validateMap } from '@allmaps/annotation'

import { fetchMaps } from '$lib/shared/api.js'

import type { Map as GeoreferencedMap } from '@allmaps/annotation'

import type { Source } from '$lib/shared/types.js'
import type { SourceState } from '$lib/state/source.svelte.js'

// PUT when new source

// GET maps/:id

// merge

const API_KEY = Symbol('api')

export class ApiState {
  #maps: GeoreferencedMap[] = $state([])

  #mapsByImageId = $derived.by(() => {
    const mapsByImageId: Record<string, GeoreferencedMap[]> = {}

    this.#maps.forEach((map) => {
      if (!mapsByImageId[map.resource.id]) {
        mapsByImageId[map.resource.id] = []
      }

      mapsByImageId[map.resource.id].push(map)
    })

    return mapsByImageId
  })

  constructor(sourceState: SourceState) {
    $effect(() => {
      if (sourceState.source) {
        this.fetchAnnotations(sourceState.source)
      }
    })
  }

  async fetchAnnotations(source: Source) {
    // TODO: if fetch fails, PUT source to API
    console.log('Create resource in API if 404', source.url)
    const fetchedMaps = await fetchMaps(source)
    const mapOrMaps = validateMap(fetchedMaps)

    if (Array.isArray(mapOrMaps)) {
      this.#maps = mapOrMaps
    } else {
      this.#maps = [mapOrMaps]
    }
  }

  get maps() {
    return this.#maps
  }

  get mapsByImageId() {
    return this.#mapsByImageId
  }
}

export function setApiState(sourceState: SourceState) {
  return setContext(API_KEY, new ApiState(sourceState))
}

export function getApiState() {
  const apiState = getContext<ReturnType<typeof setApiState>>(API_KEY)

  if (!apiState) {
    throw new Error('ApiState is not set')
  }

  return apiState
}
