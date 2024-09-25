import { setContext, getContext } from 'svelte'

import type { MapsState } from '$lib/state/maps.svelte'

const MAPS_HISTORY_KEY = Symbol('maps-history')

export class MapsHistoryState {
  mapsByImageId: Record<string, string[]> = $state({})

  constructor(mapsState: MapsState) {
    $effect(() => {
      if ((mapsState.connectedImageId, mapsState.maps)) {
        // TODO: save history!
        console.log(
          'Save maps for image in history',
          mapsState.connectedImageId
        )
      }
    })
  }
}

export function setMapsHistoryState(mapsState: MapsState) {
  return setContext(MAPS_HISTORY_KEY, new MapsHistoryState(mapsState))
}

export function getMapsHistoryState() {
  const mapsHistoryState =
    getContext<ReturnType<typeof setMapsHistoryState>>(MAPS_HISTORY_KEY)

  if (!mapsHistoryState) {
    throw new Error('MapsHistoryState is not set')
  }

  return mapsHistoryState
}
