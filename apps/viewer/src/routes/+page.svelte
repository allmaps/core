<script lang="ts">
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { fade } from 'svelte/transition'

  import {
    Header,
    Loading,
    URLInput,
    URLType,
    Stats,
    dataStore,
    paramStore
  } from '@allmaps/ui'

  import { Navigation } from '@allmaps/ui/kit'

  import { view } from '$lib/shared/stores/view.js'
  import {
    addUrlSource,
    addStringSource,
    resetSources,
    sourcesCount,
    firstSource
  } from '$lib/shared/stores/sources.js'
  import { mapCount } from '$lib/shared/stores/maps.js'
  import { resetRenderOptionsLayer } from '$lib/shared/stores/render-options.js'
  import {
    setPrevMapActive,
    setNextMapActive
  } from '$lib/shared/stores/active.js'
  import {
    createMapOl,
    createImageOl,
    mapVectorLayerOutlinesVisible
  } from '$lib/shared/stores/openlayers.js'
  import { nextTransformation } from '$lib/shared/stores/transformation.js'
  import { nextDistortionMeasure } from '$lib/shared/stores/distortion.js'
  import { toggleGrid } from '$lib/shared/stores/grid.js'
  import experimentalFeatures from '$lib/shared/experimental-features.js'

  import Container from '$lib/components/Container.svelte'
  import Examples from '$lib/components/Examples.svelte'

  import ErrorElement from '$lib/components/elements/Error.svelte'
  import SourceError from '$lib/components/elements/SourceError.svelte'

  import 'ol/ol.css'

  let type: 'annotation'

  let initialized = false
  let showForm = false
  let error: Error | null

  let annotationString = ''

  let urlInput: URLInput

  let urlInputValue = ''

  function resetForm() {
    error = null
    annotationString = ''
    urlInputValue = ''

    showForm = true
  }

  function handleUrlInputValue() {
    urlInputValue = urlInput.getValue()
  }

  async function handleSubmit() {
    if (urlInputValue.trim()) {
      urlInput.submit()
    } else {
      dataStore.set(annotationString)
    }
  }

  function hasTouch() {
    if (browser) {
      // See:
      //  - https://css-tricks.com/touch-devices-not-judged-size/
      //  - https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
      return window.matchMedia('(pointer: coarse)').matches
    }

    return false
  }

  let autofocus = !hasTouch()

  function handleKeyup(event: KeyboardEvent) {
    const target = event.target as Element
    if (target.nodeName.toLowerCase() === 'input') {
      return
    }

    const updateView = !event.altKey
    const hideOthers = event.shiftKey

    if (event.code === 'BracketLeft') {
      setPrevMapActive({ updateView, hideOthers })
    } else if (event.code === 'BracketRight') {
      setNextMapActive({ updateView, hideOthers })
    } else if (event.key === '1') {
      $view = 'map'
    } else if (event.key === '2') {
      if (experimentalFeatures) {
        $view = 'list'
      } else {
        $view = 'image'
      }
    } else if (event.key === '3') {
      if (experimentalFeatures) {
        $view = 'image'
      }
    } else if (event.key === 'm') {
      $mapVectorLayerOutlinesVisible = !$mapVectorLayerOutlinesVisible
    } else if (event.key === 't') {
      nextTransformation()
    } else if (event.key === 'd') {
      nextDistortionMeasure()
    } else if (event.key === 'g') {
      toggleGrid()
    }
  }

  onMount(() => {
    createMapOl()
    createImageOl()

    paramStore.subscribe(async (value) => {
      resetRenderOptionsLayer()
      resetSources()

      initialized = true
      if (!value) {
        resetForm()
      } else {
        showForm = false

        try {
          if (value.type === 'url' && value.url) {
            await addUrlSource(value.url)
          } else if (value.data) {
            await addStringSource(value.data)
          }
        } catch (err) {
          if (err instanceof Error) {
            error = err
          }
        }
      }
    })

    document.addEventListener('keyup', handleKeyup)

    return () => {
      document.removeEventListener('keyup', handleKeyup)
    }
  })
</script>

<Stats />

<Navigation />
<div class="absolute w-full h-full flex flex-col">
  <div class="z-10">
    <Header appName="Viewer">
      {#if !showForm && initialized}
        <URLInput>
          <URLType {type} />
        </URLInput>
      {/if}
    </Header>
  </div>
  <main class="relative h-full overflow-hidden">
    {#if showForm}
      <div class="h-full flex overflow-y-auto">
        <div
          class="container mx-auto mt-10 p-2"
          transition:fade={{ duration: 120 }}
        >
          <p class="mb-3">
            Open a IIIF Resource or Georeference Annotation from a URL:
          </p>
          <URLInput
            {autofocus}
            bind:this={urlInput}
            on:value={handleUrlInputValue}
          />

          <p class="mt-3 mb-3">
            Or, paste the contents of a complete Georeference Annotation below:
          </p>
          <form on:submit|preventDefault={handleSubmit}>
            <textarea
              bind:value={annotationString}
              placeholder="Paste a Georeference Annotation here"
              class="font-mono block mb-3 w-full h-60 rounded-lg border border-gray-300 focus-within:ring-1 focus-within:ring-pink-500 focus-within:border-pink-500 text-sm"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
            ></textarea>
            <button
              type="submit"
              disabled={annotationString.length === 0 &&
                urlInputValue.length === 0}
              class="text-white bg-pink-500 hover:bg-pink-400 transition-colors disabled:bg-gray-500 focus:ring focus:ring-pink-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 focus:outline-none"
              >View</button
            >
          </form>
          <section>
            <Examples />
          </section>
        </div>
      </div>
    {:else if $mapCount}
      <Container />
    {:else if $mapCount === 0 && $sourcesCount > 0}
      <div class="h-full flex flex-col gap-2 items-center justify-center">
        <SourceError source={$firstSource} />
      </div>
    {:else if error}
      <div class="h-full flex flex-col gap-2 items-center justify-center">
        <ErrorElement {error} />
      </div>
    {:else if initialized}
      <div class="h-full flex items-center justify-center">
        <Loading />
      </div>
    {/if}
  </main>
</div>
