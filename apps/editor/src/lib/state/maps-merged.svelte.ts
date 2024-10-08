import { setContext, getContext } from 'svelte'

import { fromDbMap } from '$lib/shared/maps.js'

import type { GeoreferencedMapsByImageId } from '$lib/shared/types.js'

import type { MapsState } from '$lib/state/maps.svelte.js'
import type { ApiState } from '$lib/state/api.svelte.js'
import type { MapsHistoryState } from '$lib/state/maps-history.svelte.js'

const MAPS_MERGED_KEY = Symbol('maps-merged')

export class MapsMergedState {
  #apiState: ApiState
  #mapsHistoryState: MapsHistoryState
  #mapsState: MapsState

  #mapsByImageId = $derived.by<GeoreferencedMapsByImageId>(() => {
    const activeImageMapsByImageId: GeoreferencedMapsByImageId = {}

    if (this.#mapsState.connectedImageId && this.#mapsState.maps) {
      const activeImageMaps = Object.values(this.#mapsState.maps).map(fromDbMap)
      activeImageMapsByImageId[this.#mapsState.connectedImageId] =
        activeImageMaps
    }

    return {
      ...this.#apiState.mapsByImageId,
      ...Object.fromEntries(this.#mapsHistoryState.mapsByImageId.entries()),
      ...activeImageMapsByImageId
    }
  })

  constructor(
    mapsState: MapsState,
    mapsHistoryState: MapsHistoryState,
    apiState: ApiState
  ) {
    this.#apiState = apiState
    this.#mapsHistoryState = mapsHistoryState
    this.#mapsState = mapsState
  }

  get mapsByImageId() {
    return this.#mapsByImageId
  }

  get maps() {
    return Object.values(this.#mapsByImageId).flat()
  }

  get fetched() {
    return this.#apiState.fetched
  }
}

export function setMapsMergedState(
  mapsState: MapsState,
  mapsHistoryState: MapsHistoryState,
  apiState: ApiState
) {
  return setContext(
    MAPS_MERGED_KEY,
    new MapsMergedState(mapsState, mapsHistoryState, apiState)
  )
}

export function getMapsMergedState() {
  const mapsMergedState =
    getContext<ReturnType<typeof setMapsMergedState>>(MAPS_MERGED_KEY)

  if (!mapsMergedState) {
    throw new Error('MapsMergedState is not set')
  }

  return mapsMergedState
}
