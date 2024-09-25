<script lang="ts">
  import { page } from '$app/stores'

  import {
    CaretLeft as CaretLeftIcon,
    CaretRight as CaretRightIcon
  } from 'phosphor-svelte'

  import { createRouteUrl, getRouteId, gotoRoute } from '$lib/shared/router.js'
  import { parseLanguageString } from '$lib/shared/iiif.js'

  import { getSourceState } from '$lib/state/source.svelte'

  const sourceState = getSourceState()

  const canvasLabel = $derived(sourceState.activeCanvas?.label)

  function handlePreviousClick() {
    gotoRoute(
      createRouteUrl($page, getRouteId($page), {
        image: sourceState.getPreviousActiveImageId()
      })
    )
  }

  function handleNextClick() {
    gotoRoute(
      createRouteUrl($page, getRouteId($page), {
        image: sourceState.getNextActiveImageId()
      })
    )
  }
</script>

{#if sourceState.activeImageIndex !== undefined}
  <div class="bg-white rounded-md p-2 flex gap-2 items-center">
    <button onclick={handlePreviousClick}>
      <CaretLeftIcon class="size-6" />
    </button>

    <div>
      <span class="hidden md:inline-block">Image&nbsp;</span
      >{sourceState.activeImageIndex + 1} / {sourceState.images.length}
    </div>
    {#if canvasLabel}
      <span class="hidden md:inline-block italic"
        >— {parseLanguageString(canvasLabel, 'en')}&nbsp;</span
      >
    {/if}

    <button onclick={handleNextClick}>
      <CaretRightIcon class="size-6" />
    </button>
  </div>
{/if}
