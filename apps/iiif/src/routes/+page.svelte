<script lang="ts">
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { page } from '$app/stores'

  import { IIIF } from '@allmaps/iiif-parser'
  import { parseAnnotation } from '@allmaps/annotation'

  import { Header, URLInput, URLType, Loading, urlStore } from '@allmaps/ui'

  import OpenSeadragon from '$lib/components/OpenSeadragon.svelte'

  import {
    Image as IIIFImage,
    Manifest as IIIFManifest,
    Collection as IIIFCollection
  } from '@allmaps/iiif-parser'

  let url: string | undefined = get(urlStore)

  let loaded = false
  let mounted = false
  let error: string | undefined

  let type: 'manifest' | 'image' | 'collection' | 'annotation'

  let imageUris = new Set<string>()

  onMount(async () => {
    mounted = true
    urlStore.subscribe((value) => {
      loadUrl(value)
    })
  })

  function fetchJson(url: string) {
    return fetch(url).then((response) => response.json())
  }

  async function loadUrl(newUrl: string) {
    if (newUrl) {
      url = newUrl

      imageUris = new Set()
      loaded = false
      error = undefined

      try {
        const json = await fetchJson(url)

        if (json.type === 'Annotation' || json.type === 'AnnotationPage') {
          // JSON might be a Georeference Annotation
          const maps = parseAnnotation(json)
          type = 'annotation'
          maps.forEach((map) => addImageUri(map.resource.id))
          loaded = true
        } else {
          // JSON might be IIIF data
          const parsedIiif = IIIF.parse(json)
          type = parsedIiif.type

          addImages(parsedIiif)
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          error = err.message
        } else {
          error = 'Unknown error'
        }
      }
    } else {
      url = undefined
    }
  }

  function locationUrlWithInfoJson(url: string) {
    const searchParams = $page.url.searchParams

    const slash = url.endsWith('/') ? '' : '/'
    searchParams.set('url', `${url}${slash}info.json`)
    return `${window.location.pathname}?${searchParams.toString()}`
  }

  function addManifest(manifest: IIIFManifest) {
    manifest.canvases.forEach(({ image }) => addImageUri(image.uri))
  }

  function addImageUri(imageUri: string) {
    imageUris.add(imageUri)
    imageUris = imageUris
  }

  async function addImages(
    parsedIiif: IIIFImage | IIIFManifest | IIIFCollection
  ) {
    if (parsedIiif instanceof IIIFCollection) {
      for await (const next of parsedIiif.fetchNext({
        fetchImages: false
      })) {
        if (next.item instanceof IIIFManifest) {
          addManifest(next.item)
        }
      }
    } else if (parsedIiif instanceof IIIFManifest) {
      addManifest(parsedIiif)
    } else {
      addImageUri(parsedIiif.uri)
    }

    loaded = true
  }
</script>

<div class="absolute w-full h-full flex flex-col">
  <Header appName="IIIF">
    {#if url}
      <URLInput>
        <URLType {type} />
      </URLInput>
    {/if}
  </Header>
  {#if !url || !loaded || error}
    <main class="container m-auto p-1 md:p-2">
      {#if !url && mounted}
        <URLInput />
      {:else if error}
        <div class="flex flex-col items-center">
          <p>Error: {error}</p>
          {#if url && !url.endsWith('info.json')}
            <p>
              If you're loading a IIIF Image, try again by <a
                href={locationUrlWithInfoJson(url)}
                >adding <code>info.json</code> to the URL</a
              >.
            </p>
          {/if}
        </div>
      {:else if !loaded}
        <div class="flex flex-col items-center">
          <Loading />
          <p>
            {imageUris.size} images loaded…
          </p>
        </div>
      {/if}
    </main>
  {:else}
    <main class="grow">
      <OpenSeadragon imageUris={Array.from(imageUris)} />
    </main>
  {/if}
</div>

<svelte:head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');

    :root {
      font-family: 'Inter', sans-serif;
    }
  </style>
</svelte:head>
