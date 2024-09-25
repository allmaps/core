<script lang="ts">
  import { generateAnnotation } from '@allmaps/annotation'

  import { highlight } from '$lib/shared/highlight.js'

  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'

  import { fromDbMap, fromDbMaps } from '$lib/shared/maps.js'

  import Scope from './Scope.svelte'

  const scopeState = getScopeState()
  const mapsState = getMapsState()

  let annotation = $derived.by(() => {
    if (scopeState.scope === 'images') {
      return '1'
    } else if (scopeState.scope === 'image') {
      return generateAnnotation(fromDbMaps(mapsState.maps))
    } else if (scopeState.scope === 'map') {
      const map = mapsState.activeMap
      if (map) {
        return generateAnnotation(fromDbMap(map))
      }
    }

    return ''
  })
</script>

<div
  class="max-w-screen-md max-h-[50vh] overflow-auto [&>*]:overflow-auto [&>*]:p-2 [&>*]:whitespace-pre-wrap"
>
  {@html highlight(annotation)}
</div>
<Scope />
