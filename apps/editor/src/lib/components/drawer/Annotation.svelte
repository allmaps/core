<script lang="ts">
  import { generateAnnotation } from '@allmaps/annotation'

  import { highlight } from '$lib/shared/highlight.js'

  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'

  import { fromDbMap, fromDbMaps } from '$lib/shared/maps.js'

  import Scope from './Scope.svelte'

  const scopeState = getScopeState()
  const mapsState = getMapsState()
  const mapsMergedState = getMapsMergedState()

  let annotation = $derived.by(() => {
    if (scopeState.scope === 'images') {
      return generateAnnotation(mapsMergedState.maps)
    } else if (scopeState.scope === 'image') {
      if (mapsState.maps) {
        return generateAnnotation(fromDbMaps(mapsState.maps))
      }
    } else if (scopeState.scope === 'map') {
      const map = mapsState.activeMap
      if (map) {
        return generateAnnotation(fromDbMap(map))
      }
    }

    return generateAnnotation([])
  })
</script>

<div
  class="rounded-md min-w-0 max-w-screen-md max-h-[50vh] overflow-auto [&>*]:overflow-auto [&>*]:p-2 [&>*]:whitespace-pre-wrap [&>*]:break-all"
>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html highlight(annotation)}
</div>
<Scope />
