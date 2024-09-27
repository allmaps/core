<script lang="ts">
  import { parseLanguageString } from '$lib/shared/iiif.js'

  import { getSourceState } from '$lib/state/source.svelte'

  const sourceState = getSourceState()

  const parsedIiif = $derived(sourceState.source?.parsedIiif)

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
</script>

<div>
  <a class="underline" href={sourceState.source?.url}
    >{sourceState.source?.url}</a
  >
</div>
<div>{labelString}</div>
<div>{descriptionString}</div>
<dl class="grid grid-cols-2 max-h-40 overflow-scroll shadow-inner p-2">
  {#each metadataStrings as { label, value }}
    <dt>{label}</dt>
    <dd>{value}</dd>
  {/each}
</dl>

<div>{parseLanguageString(sourceState.activeCanvas?.label, 'en')}</div>
<div>
  <a class="underline" href={`${sourceState.activeImage?.uri}/info.json`}
    >{sourceState.activeImage?.uri}</a
  >
</div>
<div>
  {#if sourceState.activeImage && !sourceState.activeImage.embedded}
    {sourceState.activeImage?.width} × {sourceState.activeImage?.height} pixels
  {/if}
</div>
