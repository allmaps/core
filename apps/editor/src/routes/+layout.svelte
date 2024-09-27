<script lang="ts">
  import { page } from '$app/stores'
  import { afterNavigate } from '$app/navigation'

  import { createRouteUrl, gotoRoute, getRouteId } from '$lib/shared/router.js'

  import { setUrlState } from '$lib/state/url.svelte.js'
  import { setSourceState } from '$lib/state/source.svelte.js'
  import { setMapsState } from '$lib/state/maps.svelte.js'
  import { setErrorState } from '$lib/state/error.svelte.js'
  import { setScopeState } from '$lib/state/scope.svelte.js'
  import { setUiState } from '$lib/state/ui.svelte.js'
  import { setMapsHistoryState } from '$lib/state/maps-history.svelte.js'
  import { setMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { setApiState } from '$lib/state/api.svelte.js'
  import { setExamplesState } from '$lib/state/examples.svelte.js'
  import { setImageInfoState } from '$lib/state/image-info.svelte.js'

  import { Header, Stats, Loading } from '@allmaps/ui'

  import URLInput from '$lib/components/URLInput.svelte'
  import ImageSelector from '$lib/components/ImageSelector.svelte'
  import Drawer from '$lib/components/Drawer.svelte'

  import {
    Images as ImagesIcon,
    Polygon as PolygonIcon,
    MapPinSimple as MapPinSimpleIcon
  } from 'phosphor-svelte'

  import type { Snippet } from 'svelte'

  import '../app.css'
  import '@allmaps/ui/css/fonts.css'

  import 'ol/ol.css'

  const { children }: { children: Snippet } = $props()

  const urlState = setUrlState($page.url)
  const errorState = setErrorState()
  setExamplesState()

  setUiState()
  setImageInfoState()

  const sourceState = setSourceState(urlState, errorState)
  const apiState = setApiState(sourceState)

  const mapsState = setMapsState(sourceState)
  const mapsHistoryState = setMapsHistoryState(mapsState)
  setMapsMergedState(mapsState, mapsHistoryState, apiState)

  setScopeState()

  function handleInputSubmit(url: string) {
    gotoRoute(createRouteUrl($page, getRouteId($page), { url }))
  }

  function handleKeypress(event: KeyboardEvent) {
    // keyPressHandler: function (event) {
    //     const tagName = event.target.tagName.toLowerCase()
    //     if (tagName === 'input' || tagName === 'textarea') {
    //       return
    //     }
    if (event.key === '[') {
      const previousImageId = sourceState.getPreviousActiveImageId()

      gotoRoute(
        createRouteUrl($page, getRouteId($page), { image: previousImageId })
      )
    } else if (event.key === ']') {
      const nextImageId = sourceState.getNextActiveImageId()

      gotoRoute(
        createRouteUrl($page, getRouteId($page), { image: nextImageId })
      )
    } else if (event.key === '1') {
      gotoRoute(createRouteUrl($page, 'images'))
    } else if (event.key === '2') {
      gotoRoute(createRouteUrl($page, 'mask'))
    } else if (event.key === '3') {
      gotoRoute(createRouteUrl($page, 'georeference'))
      // } else if (event.key === 'i') {
      //   this.toggleDrawer('metadata')
      // } else if (event.key === 'm') {
      //   this.toggleDrawer('maps')
      // } else if (event.key === 'a') {
      //   this.toggleDrawer('annotation')
    }
  }

  afterNavigate(() => {
    urlState.updateUrl($page.url)
  })
</script>

<svelte:body onkeypress={handleKeypress} />

<Stats />

<div class="absolute w-full h-full grid grid-rows-[min-content_1fr]">
  <Header appName="Editor">
    {#if urlState.urlParam}
      <div class="flex w-full items-center gap-2">
        <URLInput onSubmit={handleInputSubmit} {urlState} />
        <span class="shrink-0">All edits are automatically saved</span>
      </div>
    {/if}
  </Header>

  <div class="relative">
    <div class="w-full flex justify-center">
      {#if sourceState.loading}
        <div
          class="absolute w-full h-full top-0 left-0 flex items-center justify-center"
        >
          <Loading />
        </div>
      {:else}
        {#if getRouteId($page) !== ''}
          <nav
            class="z-10 grid grid-cols-3 gap-2 rounded-9px bg-dark-10 p-2 font-semibold"
          >
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
              data-state={getRouteId($page) === 'georeference'
                ? 'active'
                : undefined}
              class="rounded-lg bg-white/50 transition-colors p-2 data-[state=active]:bg-white data-[state=active]:shadow-mini dark:data-[state=active]:bg-muted flex items-center justify-center gap-2"
            >
              <MapPinSimpleIcon size={28} class="inline" />
              <span class="text-xs sm:text-base">Georeference</span>
            </a>
          </nav>
          <div
            class="absolute bottom-0 w-full z-50 p-2 flex gap-2 justify-between min-w-0 pointer-events-none [&>*]:pointer-events-auto"
          >
            <div class="flex flex-col justify-end min-w-0 shrink-0">

              {#if sourceState.imageCount > 1}
                <ImageSelector />
              {/if}
            </div>
            <div class="flex flex-col justify-end min-w-0">
              <Drawer />
            </div>
          </div>
        {/if}
        <div class="absolute w-full h-full top-0 left-0">
          {@render children()}
        </div>
      {/if}
    </div>
  </div>
</div>
