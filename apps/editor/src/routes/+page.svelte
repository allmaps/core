<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'

  import { browser } from '$app/environment'

  import { createRouteUrl, gotoRoute } from '$lib/shared/router'
  import { getUrlState } from '$lib/state/url.svelte.js'

  import URLInput from '$lib/components/URLInput.svelte'
  import Examples from '$lib/components/Examples.svelte'

  let autofocus = $state(false)

  let urlState = getUrlState()

  function hasTouch() {
    if (browser) {
      // See:
      //  - https://css-tricks.com/touch-devices-not-judged-size/
      //  - https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
      return window.matchMedia('(pointer: coarse)').matches
    }

    return false
  }

  $effect.pre(() => {
    autofocus = !hasTouch()
  })

  function handleInputSubmit(url: string) {
    gotoRoute(createRouteUrl($page, 'images', { url }))
  }

  onMount(() => {
    autofocus = !hasTouch()

    const hash = $page.url.hash
    if (hash) {
      const pathWithSearchParams = hash.slice(1)
      if (pathWithSearchParams.length > 1) {
        if (pathWithSearchParams.startsWith('/collection')) {
          pathWithSearchParams.replace('/collection', '/images')
        }

        const newUrl = `${$page.url.origin}${pathWithSearchParams}`
        goto(newUrl)
      }
    }
  })
</script>

<div class="max-w-screen-lg p-4 m-auto space-y-4">
  <p class="mb-3">Open a IIIF Resource from a URL:</p>
  <URLInput onSubmit={handleInputSubmit} {urlState} {autofocus} />
  <!-- <URLInput {autofocus} bind:this={urlInput} on:value={handleUrlInputValue} /> -->
  <!-- disabled={urlInputValue.length === 0} -->
  <!-- <button
    type="submit"
    onclick={handleSubmit}
    class="text-white bg-pink-500 hover:bg-pink-400 transition-colors disabled:bg-gray-500 focus:ring focus:ring-pink-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 focus:outline-none"
    >View</button
  > -->
  <p class="mb-3">Or use one of the following examples:</p>
  <Examples />
</div>
