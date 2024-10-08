<script lang="ts">
  import { fade } from 'svelte/transition'

  import { parseLanguageString } from '$lib/shared/iiif.js'

  import { getSourceState } from '$lib/state/source.svelte'

  const sourceState = getSourceState()

  const parsedIiif = $derived(sourceState.source?.parsedIiif)

  const typeString = $derived.by(() => {
    const type = sourceState.source?.type
    if (type === 'collection') {
      return 'IIIF Collection'
    } else if (type === 'manifest') {
      return 'IIIF Manifest'
    } else if (type === 'image') {
      return 'IIIF Image'
    }
  })

  const typeUrl = $derived.by(() => {
    const type = sourceState.source?.type
    const majorVersion = sourceState.source?.parsedIiif?.majorVersion
    if (type === 'collection' && majorVersion === 2) {
      return 'https://iiif.io/api/presentation/2.0/#collections'
    } else if (type === 'collection' && majorVersion === 3) {
      return 'https://iiif.io/api/presentation/3.0/#51-collection'
    } else if (type === 'manifest' && majorVersion === 2) {
      return 'https://iiif.io/api/presentation/2.0/#manifest'
    } else if (type === 'manifest' && majorVersion === 3) {
      return 'https://iiif.io/api/presentation/3.0/#52-manifest'
    } else if (type === 'image' && majorVersion === 1) {
      return 'https://iiif.io/api/image/1.1/'
    } else if (type === 'image' && majorVersion === 2) {
      return 'https://iiif.io/api/image/2.1/'
    } else if (type === 'image' && majorVersion === 3) {
      return 'https://iiif.io/api/image/3.0/'
    }
  })

  const label = $derived.by(() => {
    if (parsedIiif?.type === 'manifest' || parsedIiif?.type === 'collection') {
      return parsedIiif.label
    }
  })

  const description = $derived.by(() => {
    if (parsedIiif?.type === 'manifest') {
      return parsedIiif.description
    }
  })

  const metadata = $derived.by(() => {
    if (parsedIiif?.type === 'manifest') {
      return parsedIiif.metadata
    }
  })

  const labelString = $derived(parseLanguageString(label, 'en'))
  const descriptionString = $derived(parseLanguageString(description, 'en'))

  const metadataStrings = $derived(
    metadata
      ? metadata.map((item) => ({
          label: parseLanguageString(item.label, 'en'),
          value: parseLanguageString(item.value, 'en')
        }))
      : []
  )

  const showActiveImageInfo = $derived(
    sourceState.source && sourceState.source.type !== 'image'
  )

  const activeImageLabel = $derived(
    parseLanguageString(sourceState.activeCanvas?.label, 'en')
  )

  // TODO: use label=for
</script>

<div class="grid grid-cols-[max-content_1fr] gap-2 [&>*]:break-all">
  <div class="col-span-2 font-bold">
    You're georeferencing this IIIF resource:
  </div>
  {#if sourceState.source}
    <div>Type:</div>
    <a class="underline" href={typeUrl}>{typeString}</a>
    <div>URL:</div>
    <a class="underline" href={sourceState.source.url}
      >{sourceState.source?.url}</a
    >
  {/if}
  {#if labelString}
    <div>Label:</div>
    <div>{labelString}</div>
  {/if}
  {#if descriptionString}
    <div>Description:</div>
    <div>{descriptionString}</div>
  {/if}
  {#if metadataStrings.length}
    <div class="col-span-2">Metadata:</div>
    <dl
      class="grid grid-cols-subgrid col-span-2 gap-2 max-h-36 overflow-scroll shadow-inner p-2 bg-gray/5 rounded-md"
    >
      {#each metadataStrings as { label, value }}
        <dt>{label}</dt>
        <dd>{value}</dd>
      {/each}
    </dl>
  {/if}

  {#if showActiveImageInfo}
    <div class="col-span-2 font-bold">Current image:</div>
    <div>URL:</div>
    <div>
      <a class="underline" href={`${sourceState.activeImage?.uri}/info.json`}
        >{sourceState.activeImage?.uri}</a
      >
    </div>
    {#if activeImageLabel}
      <div>Label:</div>
      <div>{activeImageLabel}</div>
    {/if}
    <div>Resolution:</div>
    <div>
      {#if sourceState.activeImage && !sourceState.activeImage.embedded}
        <span transition:fade
          >{sourceState.activeImage?.width} × {sourceState.activeImage?.height} pixels</span
        >
      {/if}
    </div>
  {/if}
</div>
