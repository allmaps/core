<script lang="ts">
  import { page } from '$app/stores'

  import {
    Images as ImagesIcon,
    Polygon as PolygonIcon,
    MapPinSimple as MapPinSimpleIcon
  } from 'phosphor-svelte'

  import { createRouteUrl, getRouteId } from '$lib/shared/router.js'
  import { getSourceState } from '$lib/state/source.svelte.js'

  import ImageSelector from '$lib/components/ImageSelector.svelte'
  import Drawer from '$lib/components/Drawer.svelte'

  const sourceState = getSourceState()
</script>

<div class="w-full h-full flex flex-col items-center p-2 gap-2">
  <nav class="z-10 grid grid-cols-3 gap-2 rounded-9px bg-dark-10 font-semibold">
    <a
      href={createRouteUrl($page, 'images', {
        image: sourceState.activeImageId || undefined
      })}
      data-state={getRouteId($page) === 'images' ? 'active' : undefined}
      class="rounded-lg bg-white/50 transition-colors p-2 data-[state=active]:bg-white data-[state=active]:shadow-mini dark:data-[state=active]:bg-muted flex items-center justify-center gap-2"
    >
      <ImagesIcon size={28} class="inline" />
      <span class="text-xs sm:text-base">Images</span>
    </a>
    <a
      href={createRouteUrl($page, 'mask', {
        image: sourceState.activeImageId || undefined
      })}
      data-state={getRouteId($page) === 'mask' ? 'active' : undefined}
      class="rounded-lg bg-white/50 transition-colors p-2 data-[state=active]:bg-white data-[state=active]:shadow-mini dark:data-[state=active]:bg-muted flex items-center justify-center gap-2"
    >
      <PolygonIcon size={28} class="inline" />
      <span class="text-xs sm:text-base">Mask</span>
    </a>
    <a
      href={createRouteUrl($page, 'georeference', {
        image: sourceState.activeImageId || undefined
      })}
      data-state={getRouteId($page) === 'georeference' ? 'active' : undefined}
      class="rounded-lg bg-white/50 transition-colors p-2 data-[state=active]:bg-white data-[state=active]:shadow-mini dark:data-[state=active]:bg-muted flex items-center justify-center gap-2"
    >
      <MapPinSimpleIcon size={28} class="inline" />
      <span class="text-xs sm:text-base">Georeference</span>
    </a>
  </nav>

  <!-- <div> -->
  <div
    class="w-full h-full shrink min-h-0 flex gap-2 items-end justify-between [&>*]:relative [&>*]:z-10 [&>*]:pointer-events-auto"
  >
    {#if sourceState.imageCount > 1}
      <ImageSelector />
    {:else}
      <div></div>
    {/if}

    <!-- <div class="contents [&>*]:z-10 [&>*]:pointer-events-auto"> -->
    <Drawer />
    <!-- </div> -->
  </div>
  <!-- <div
    class=" z-50 p-2 flex gap-2 justify-between min-w-0 pointer-events-none [&>*]:pointer-events-auto"
  >
    <div class="flex flex-col justify-end min-w-0 shrink-0">
      {#if sourceState.imageCount > 1}
        <ImageSelector />
      {/if}
    </div>
    <div class="flex flex-col justify-end min-w-0">
      <Drawer />
    </div>
  </div> -->
</div>
