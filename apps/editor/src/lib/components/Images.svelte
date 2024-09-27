<script lang="ts">
  import { page } from '$app/stores'

  import { Collection, Thumbnail } from '@allmaps/ui'

  import Status from '$lib/components/Status.svelte'

  import { createRouteUrl, gotoRoute } from '$lib/shared/router'
  import { parseLanguageString } from '$lib/shared/iiif.js'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getImageInfoState } from '$lib/state/image-info.svelte.js'

  const sourceState = getSourceState()
  const imageInfoState = getImageInfoState()

  function handleImageClick(event: Event, imageId: string) {
    gotoRoute(createRouteUrl($page, 'images', { image: imageId }))
    event.preventDefault()
  }

  function handleImageDblclick(event: Event, imageId: string) {
    gotoRoute(createRouteUrl($page, 'mask', { image: imageId }))
    event.preventDefault()
  }

  function isActive(imageId: string) {
    return imageId === sourceState.activeImageId
  }
</script>

<div class="max-w-screen-lg m-auto p-4">
  {#if sourceState.imageCount > 0}
    <Collection>
      {#each [...sourceState.images] as image (image.uri)}
        {@const canvas = sourceState.getCanvasByImageId(image.uri)}

        <a
          onclick={(event) => handleImageClick(event, image.uri)}
          ondblclick={(event) => handleImageDblclick(event, image.uri)}
          href={createRouteUrl($page, 'mask', { image: image.uri })}
          class="rounded overflow-hidden"
        >
          <div class="relative">
            <!-- TODO: move to load function -->
            {#await imageInfoState.fetchImageInfo(image.uri)}
              <div class="aspect-square bg-white/50 p-2">
                <p>Loading…</p>
              </div>
            {:then imageInfo}
              <Thumbnail
                {imageInfo}
                width={300}
                alt={parseLanguageString(canvas?.label, 'en')}
              />
            {:catch error}
              <div>
                <p class="aspect-square">{error.message}</p>
              </div>
            {/await}
            <div class="absolute bottom-0 w-full flex justify-end p-2">
              <Status imageId={image.uri} />
            </div>
            <div
              class="border-solid absolute top-0 w-full h-full pointer-events-none"
              class:border-pink={isActive(image.uri)}
              class:border-4={isActive(image.uri)}
            ></div>
          </div>
        </a>
      {/each}
    </Collection>
  {/if}
</div>
