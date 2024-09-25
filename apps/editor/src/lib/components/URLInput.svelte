<script lang="ts">
  import { UrlState } from '$lib/state/url.svelte.js'

  type Props = {
    urlState: UrlState
    onSubmit: (url: string) => void
    autofocus?: boolean
    placeholder?: string
  }

  let {
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

  // export let autofocus: boolean | undefined = undefined

  // $: urlValue = $urlStore

  // $: {
  //   dispatch('value', {
  //     value: urlValue
  //   })
  // }

  // if (autofocus === undefined) {
  //   autofocus = $urlStore === ''
  // }

  // export let placeholder =
  //   'Type the URL of a IIIF Image, Manifest, Collection or Georeference Annotation'

  function selectInputText() {
    // input.focus()
    // input.setSelectionRange(0, urlValue.length)
  }

  // function handleFocus() {
  //   selectInputText()
  // }

  function handleInputKeyup(event: KeyboardEvent) {
    // if (event.key === 'Escape') {
    // urlValue = $urlStore
    // }
  }

  // function handleMouseup(event: Event) {
  //   event.preventDefault()
  // }

  // export function getValue() {
  //   return urlValue
  // }

  // export function submit() {
  //   if (urlValue) {
  //     setStoreValue(urlValue)
  //   }
  // }

  // function setStoreValue(urlValue: string) {
  //   $urlStore = urlValue
  // }

  // function handleDocumentKeyup(event: KeyboardEvent) {
  //   const target = event.target as Element
  //   if (event.key === '/' && target.nodeName.toLowerCase() !== 'input') {
  //     selectInputText()
  //   }
  // }

  // onMount(() => {
  //   document.addEventListener('keyup', handleDocumentKeyup)

  //   return () => {
  //     document.removeEventListener('keyup', handleDocumentKeyup)
  //   }
  // })

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
    <slot />
  </div>
</form>

<!--
<form
  class="flex items-center gap-2 w-full rounded-lg border border-gray-300 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500 text-sm"
  on:submit|preventDefault={submit}
>

  <input
    type="input"
    {autofocus}
    on:focus|preventDefault={handleFocus}
    on:keyup={handleInputKeyup}
    on:mouseup={handleMouseup}
    bind:value={urlValue}
    bind:this={input}
    class="bg-transparent w-full rounded-lg px-2 py-1 focus:outline-none truncate"
    {placeholder}
  />
  <div class="shrink-0">
    <slot />
  </div>
</form> -->
