<script lang="ts">
  import { getSourceState } from '$lib/state/source.svelte'

  import { parseLanguageString } from '$lib/shared/iiif.js'

  const sourceState = getSourceState()

  let label = $derived(parseLanguageString(sourceState.label, 'en'))
</script>

{#if label.length}
  <span title={label} class="inline-block truncate">{label}</span>
{/if}
