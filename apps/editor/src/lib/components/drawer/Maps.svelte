<script lang="ts">
  import { slide } from 'svelte/transition'

  import { Trash as TrashIcon } from 'phosphor-svelte'

  import { getResourceMask } from '$lib/shared/maps.js'
  import { getMaskDimensions, getMaskExtent } from '$lib/shared/geometry.js'

  import { getMapsState } from '$lib/state/maps.svelte.js'

  import StartGeoreferencing from '$lib/components/StartGeoreferencing.svelte'

  import type { DbMap } from '$lib/shared/types.js'

  const mapsState = getMapsState()

  let mapCount = $derived(
    mapsState.maps ? Object.values(mapsState.maps).length : 0
  )

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
    return coordinate.toFixed(0)
  }

  function formatGeoCoordinate(coordinate: number) {
    return coordinate.toFixed(5)
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
  <StartGeoreferencing />
{:else}
  <ol class="maps grid auto-rows-auto gap-2">
    {#each Object.values(mapsState.maps || {}) as map, index}
      {@const gcpCount = Object.values(map.gcps).length}
      {@const isActiveMap = mapsState.activeMapId === map.id}
      <li
        class="col-span-9 grid grid-cols-subgrid"
        transition:slide={{ duration: 250, axis: 'y' }}
      >
        <button
          class="col-span-8 grid grid-cols-subgrid group"
          onclick={() => handleMapClick(map.id)}
        >
          <div>
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
              </div>
            {/if}
          </div>
          <div
            class="col-span-7 place-self-start self-center flex gap-3 items-center"
          >
            <span>Map {index + 1}</span>
            <span class="font-light text-sm text-black/75"
              >{gcpCount} {gcpCount === 1 ? 'GCP' : 'GCPs'}
            </span>
          </div>
        </button>
        <button
          class="place-self-end self-center"
          onclick={() => mapsState.removeMap({ mapId: map.id })}
        >
          <TrashIcon />
        </button>

        {#if isActiveMap && gcpCount > 0}
          <ol
            class="col-span-9 grid grid-cols-subgrid"
            transition:slide={{ duration: 250, axis: 'y' }}
          >
            {#each Object.values(map.gcps) as gcp, index}
              {@const isActiveGcp = mapsState.activeGcpId === gcp.id}
              <li class="contents">
                <button
                  class="col-span-8 grid gap-0 grid-cols-subgrid"
                  onclick={() => handleGcpClick(map.id, gcp.id)}
                >
                  <div class="inline-block h-8">
                    <div class="inline-flex size-4 justify-center items-center">
                      <span
                        class="size-3 rounded-full bg-pink transition-all"
                        class:size-3={!isActiveGcp}
                        class:size-4={isActiveGcp}
                      ></span>
                    </div>
                    <span class="relative top-2 text-sm">
                      {index + 1}
                    </span>
                  </div>

                  <div
                    class="col-span-7 grid gap-1 grid-cols-subgrid geograph-tnum place-items-end"
                  >
                    {#if gcp.resource}
                      <span inert class="text-gray-300">(</span><span
                        >{formatResourceCoordinate(gcp.resource[0])}<span
                          inert
                          class="text-gray-300">,</span
                        ></span
                      ><span class="space-x-1">
                        <span>{formatResourceCoordinate(gcp.resource[1])}</span
                        ><span inert class="text-gray-300">)</span></span
                      >
                    {:else}
                      <span class="col-span-3"></span>
                    {/if}
                    <span inert class="text-gray-300">⇒</span>
                    {#if gcp.geo}
                      <span inert class="text-gray-300">(</span><span
                        >{formatGeoCoordinate(gcp.geo[0])}<span
                          inert
                          class="text-gray-300">,</span
                        ></span
                      >
                      <span class="space-x-1">
                        <span>{formatGeoCoordinate(gcp.geo[1])}</span><span
                          inert
                          class="text-gray-300">)</span
                        ></span
                      >
                    {:else}
                      <span class="col-span-3"></span>
                    {/if}
                  </div>
                </button>
                <button
                  class="place-self-end self-center"
                  onclick={() =>
                    mapsState.removeGcp({ mapId: map.id, gcpId: gcp.id })}
                >
                  <TrashIcon />
                </button>
              </li>
            {/each}
          </ol>
        {/if}
      </li>
    {/each}
  </ol>
{/if}

<style scoped>
  .maps {
    grid-template-columns: repeat(8, max-content) 1fr;
  }
</style>
