import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { fromDbMap } from '$lib/shared/maps.js'

import type { Map as GeoreferencedMap } from '@allmaps/annotation'

import type { MapsState } from '$lib/state/maps.svelte'

const MAPS_HISTORY_KEY = Symbol('maps-history')

export class MapsHistoryState {
  #mapsByImageId: SvelteMap<string, GeoreferencedMap[]> = $state(
    new SvelteMap()
  )

  constructor(mapsState: MapsState) {
    $effect(() => {
      if ((mapsState.connectedImageId, mapsState.maps)) {
        if (mapsState.connectedImageId && mapsState.maps) {
          const maps = Object.values(mapsState.maps).map(fromDbMap)
          this.#mapsByImageId.set(mapsState.connectedImageId, maps)
        }
      }
    })
  }

  get mapsByImageId() {
    return this.#mapsByImageId
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
