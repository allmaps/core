<script lang="ts">
  import { UrlState } from '$lib/state/url.svelte.js'

  import type { Snippet } from 'svelte'

  type Props = {
    children?: Snippet
    urlState: UrlState
    onSubmit: (url: string) => void
    autofocus?: boolean
    placeholder?: string
  }

  let {
    children,
    urlState,
    onSubmit,
    autofocus = false,
    placeholder = 'Type the URL of a IIIF Image, Manifest or Collection'
  }: Props = $props()

  let value = $state(urlState.urlParam)

  $effect(() => {
    if (urlState.urlParam) {
      value = urlState.urlParam
    } else {
      value = ''
    }
  })

  let input: HTMLInputElement

  function handleSubmit(event: Event) {
    event.preventDefault()

    if (value) {
      onSubmit(value)
    }
  }
</script>

<form
  onsubmit={handleSubmit}
  class="flex items-center gap-2 w-full rounded-lg border border-gray-300 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500 text-sm"
>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    type="input"
    {autofocus}
    bind:value
    bind:this={input}
    class="bg-transparent w-full rounded-lg px-2 py-1 focus:outline-none truncate"
    {placeholder}
  />
  <div class="shrink-0">
    {@render children?.()}
  </div>
</form>
