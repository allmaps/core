<script lang="ts">
  import { page } from '$app/stores'
  import { afterNavigate } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import { Dialog } from 'bits-ui'

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
  import Controls from '$lib/components/Controls.svelte'
  import Toolbar from '$lib/components/Toolbar.svelte'
  import About from '$lib/components/About.svelte'

  import type { Snippet } from 'svelte'

  import '../app.css'
  import '@allmaps/ui/css/fonts.css'

  import 'ol/ol.css'

  const { children }: { children: Snippet } = $props()

  const urlState = setUrlState($page.url)
  const errorState = setErrorState()
  setExamplesState()

  const uitState = setUiState()
  setImageInfoState()

  const sourceState = setSourceState(urlState, errorState)
  const apiState = setApiState(sourceState)

  const mapsState = setMapsState(sourceState)
  const mapsHistoryState = setMapsHistoryState(mapsState)
  setMapsMergedState(mapsState, mapsHistoryState, apiState)

  setScopeState(sourceState)

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
        <Toolbar />
      </div>
    {/if}
  </Header>

  <div class="relative flex w-full h-full justify-center min-h-0">
    {#if sourceState.loading}
      <div class="absolute w-full h-full top-0 left-0">
        <Loading />
      </div>
    {:else}
      <div class="absolute w-full h-full top-0 left-0">
        {@render children()}
      </div>
      {#if getRouteId($page) !== ''}
        <Controls />
      {/if}
    {/if}
  </div>
</div>

<Dialog.Root bind:open={uitState.showAboutDialog}>
  <Dialog.Trigger />
  <Dialog.Portal >
    <Dialog.Overlay
      transition={fade}
      transitionConfig={{ duration: 150 }}
      class="fixed inset-0 z-50 bg-black/80"
    />
    <Dialog.Content class="absolute top-0 w-full h-full flex justify-center items-center p-2"
      transition={fade}>
      <About />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
