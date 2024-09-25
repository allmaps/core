<script lang="ts">
  import { slide } from 'svelte/transition'
  import { page } from '$app/stores'

  import { Popover } from 'bits-ui'

  import { Trash as TrashIcon } from 'phosphor-svelte'

  import { getResourceMask } from '$lib/shared/maps.js'
  import { getMaskDimensions, getMaskExtent } from '$lib/shared/geometry.js'
  import { createRouteUrl, getRouteId, gotoRoute } from '$lib/shared/router.js'
  import { roundWithDecimals } from '$lib/shared/math.js'

  import { getMapsState } from '$lib/state/maps.svelte.js'

  import type {
    DbMap1,
    DbMap2,
    DbMap,
    ResourceMask
  } from '$lib/shared/types.js'

  const mapsState = getMapsState()

  let mapCount = $derived(Object.values(mapsState.maps).length)

  function hasResourceMask(map: DbMap) {
    const resourceMask = getResourceMask(map)
    return resourceMask && resourceMask.length > 0
  }

  function thumbnailViewbox(map: DbMap, padding = 5, maxHeight = 50) {
    const maskDimensions = getMaskDimensions(map)
    const scaleFactor = maxHeight / Math.max(...maskDimensions)
    return `${-padding} ${-padding} ${
      maskDimensions[0] * scaleFactor + padding * 2
    } ${maskDimensions[1] * scaleFactor + padding * 2}`
  }

  function thumbnailPolygonPoints(map: DbMap, maxHeight = 50) {
    const maskExtent = getMaskExtent(map)
    const maskDimensions = getMaskDimensions(map)
    const scaleFactor = maxHeight / Math.max(...maskDimensions)

    const resourceMask = getResourceMask(map)

    const points = resourceMask.map((point) => [
      (point[0] - maskExtent[0][0]) * scaleFactor,
      (point[1] - maskExtent[1][0]) * scaleFactor
    ])

    return points.map((point) => point.join(',')).join(' ')
  }

  function formatResourceCoordinate(coordinate: number) {
    return roundWithDecimals(coordinate, 0)
  }

  function formatGeoCoordinate(coordinate: number) {
    return roundWithDecimals(coordinate, 5)
  }

  function handleMapClick(mapId: string) {
    mapsState.activeMapId = mapId
  }

  function handleGcpClick(mapId: string, gcpId: string) {
    mapsState.activeMapId = mapId
    mapsState.activeGcpId = gcpId
  }
</script>

{#if mapCount === 0}
  <div>first georeference</div>
{:else}
  <ol class="space-y-2">
    {#each Object.values(mapsState.maps) as map, index}
      {@const gcpCount = Object.values(map.gcps).length}
      {@const isActiveMap = mapsState.activeMapId === map.id}
      <li class="space-y-2" transition:slide={{ duration: 250, axis: 'y' }}>
        <div class="flex justify-between">
          <button
            class="group flex items-center gap-4"
            onclick={() => handleMapClick(map.id)}
          >
            {#if hasResourceMask(map)}
              <div class="size-16 relative">
                <svg
                  class="w-full h-full fill-none stroke-pink stroke-2"
                  viewBox={thumbnailViewbox(map)}
                >
                  <polygon
                    points={thumbnailPolygonPoints(map)}
                    class="group-hover:fill-pink/10 {isActiveMap
                      ? 'fill-pink/25'
                      : 'fill-none'}"
                    class:fill-none={mapsState.activeMapId !== map.id}
                  />
                </svg>
                <!-- <div
                class="absolute top-0 w-full h-full flex items-center justify-center"
              >
                <span>{index + 1}</span>
              </div> -->
              </div>
            {/if}
            <span>Map {index + 1}</span>
            <span class="font-light text-sm text-black/75"
              >{gcpCount} {gcpCount === 1 ? 'GCP' : 'GCPs'}
            </span>
          </button>
          <button onclick={() => mapsState.removeMap({ mapId: map.id })}>
            <TrashIcon />
          </button>
        </div>
        {#if isActiveMap && gcpCount > 0}
          <ol class="pl-8" transition:slide={{ duration: 250, axis: 'y' }}>
            {#each Object.values(map.gcps) as gcp, index}
              {@const isActiveGcp = mapsState.activeGcpId === gcp.id}
              <li>
                <div class="flex justify-between gap-2">
                  <button
                    class="flex items-center gap-6"
                    onclick={() => handleGcpClick(map.id, gcp.id)}
                  >
                    <div class="inline-block pb-2">
                      <div
                        class="inline-flex size-4 justify-center items-center"
                      >
                        <span
                          class="size-4 rounded-full bg-pink transition-all"
                          class:size-3={!isActiveGcp}
                          class:size-4={isActiveGcp}
                        ></span>
                      </div>
                      <span class="relative top-2">
                        {index + 1}
                      </span>
                    </div>

                    <span
                      class="grid grid-row grid-cols-4 font-mono text-sm gap-2"
                    >
                      {#if gcp.resource}
                        <span>{formatResourceCoordinate(gcp.resource[0])}</span>
                        <span>{formatResourceCoordinate(gcp.resource[1])}</span>
                      {:else}
                        <span></span>
                        <span></span>
                      {/if}

                      {#if gcp.geo}
                        <span>{formatGeoCoordinate(gcp.geo[0])}</span>
                        <span>{formatGeoCoordinate(gcp.geo[1])}</span>
                      {:else}
                        <span></span>
                        <span></span>
                      {/if}
                    </span>
                  </button>
                  <button
                    onclick={() =>
                      mapsState.removeGcp({ mapId: map.id, gcpId: gcp.id })}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            {/each}
          </ol>
        {/if}
      </li>
    {/each}
  </ol>
{/if}
