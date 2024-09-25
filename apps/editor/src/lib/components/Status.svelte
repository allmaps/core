<script lang="ts">
  import { fade } from 'svelte/transition'

  import {
    Empty as EmptyIcon,
    Warning as WarningIcon,
    MapTrifold as MapTrifoldIcon
  } from 'phosphor-svelte'

  import type { Map as GeoreferencedMap } from '@allmaps/annotation'

  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'

  const mapsMergedState = getMapsMergedState()

  let { imageId }: { imageId: string } = $props()

  const mapsForImageId = $derived(mapsMergedState.mapsByImageId[imageId])

  const mapsCounted = $derived.by(() => {
    if (!mapsForImageId) {
      return
    }

    let complete = 0
    let incomplete = 0

    for (const map of mapsForImageId) {
      if (isComplete(map)) {
        complete++
      } else {
        incomplete++
      }
    }

    return { complete, incomplete }
  })

  function isComplete(map: GeoreferencedMap) {
    return map.gcps.length > 2
  }
</script>

{#if mapsCounted}
  <div class="flex items-center flex-row gap-2" transition:fade>
    {#if mapsCounted.complete > 0}
      <div
        class="bg-green rounded-full px-2 py-0.5 drop-shadow-md text-sm font-bold flex items-center flex-row gap-2"
      >
        <span>{mapsCounted.complete}</span>
        <MapTrifoldIcon class="size-4" weight="bold" />
      </div>
    {/if}
    {#if mapsCounted.incomplete > 0}
      <div
        class="bg-yellow rounded-full px-2 py-0.5 drop-shadow-md text-xs font-bold flex items-center flex-row gap-2"
      >
        <span>{mapsCounted.incomplete}</span>
        <WarningIcon class="size-4" weight="bold" />
      </div>
    {/if}
    {#if mapsCounted.complete === 0 && mapsCounted.incomplete === 0}
      <div
        class="bg-red rounded-full px-2 py-0.5 drop-shadow-md text-xs font-bold"
      >
        <EmptyIcon class="size-4" weight="bold" />
      </div>
    {/if}
  </div>
{/if}
