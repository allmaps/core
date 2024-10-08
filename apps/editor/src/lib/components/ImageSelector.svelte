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
  <div class="flex bg-white rounded-md p-1 gap-1 sm:p-2 sm:gap-2 items-center">
    <button onclick={handlePreviousClick} title="Previous image">
      <CaretLeftIcon class="size-6" />
    </button>

    <div class="hidden sm:inline-block whitespace-nowrap">
      <span class="hidden md:inline-block">Image&nbsp;</span
      >{sourceState.activeImageIndex + 1} / {sourceState.imageCount}
    </div>
    {#if canvasLabel}
      <span class="hidden md:inline-block italic"
        >— {parseLanguageString(canvasLabel, 'en')}&nbsp;</span
      >
    {/if}

    <button onclick={handleNextClick} title="Next image">
      <CaretRightIcon class="size-6" />
    </button>
  </div>
{/if}
