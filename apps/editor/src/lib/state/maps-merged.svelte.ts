import { setContext, getContext } from 'svelte'

import type { MapsState } from '$lib/state/maps.svelte.js'
import type { ApiState } from '$lib/state/api.svelte.js'
import type { MapsHistoryState } from '$lib/state/maps-history.svelte.js'

const MAPS_MERGED_KEY = Symbol('maps-merged')

export class MapsMergedState {
  #apiState: ApiState
  #mapsHistoryState: MapsHistoryState
  #mapsState: MapsState

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
    return {
      // TODO: add maps from:
      // - mapsState
      // - mapsHistoryState
      ...this.#apiState.mapsByImageId
    }
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
