<script lang="ts">
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getScopeState } from '$lib/state/scope.svelte.js'

  import {
    getAnnotationUrl,
    getViewerUrl,
    getGeoJsonUrl,
    getXyzTilesUrl
  } from '$lib/shared/urls.js'

  import Scope from './Scope.svelte'

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const scopeState = getScopeState()

  const type = $derived.by(() => {
    if (scopeState.scope === 'images') {
      return sourceState.source?.type
    } else if (scopeState.scope === 'image') {
      return 'image'
    } else if (scopeState.scope === 'map') {
      return 'map'
    }
  })

  const allmapsId = $derived.by(() => {
    if (scopeState.scope === 'images') {
      return sourceState.source?.allmapsId
    } else if (scopeState.scope === 'image') {
      return sourceState.activeImageAllmapsId
    } else if (scopeState.scope === 'map') {
      return mapsState.activeMapId
    }
  })
</script>

{#if type && allmapsId}
  <div>
    <div>
      <a class="underline" href={getAnnotationUrl(type, allmapsId)}
        >Georeference Annotation</a
      >
    </div>
    <div>
      <a class="underline" href={getViewerUrl(type, allmapsId)}
        >Allmaps Viewer</a
      >
    </div>
    <div>
      <a class="underline" href={getGeoJsonUrl(type, allmapsId)}>GeoJSON</a>
    </div>
    <div>
      <a class="underline" href={getXyzTilesUrl(type, allmapsId)}
        >XYZ map tiles</a
      >
    </div>
    <!-- <div>GeoTIFF</div> -->
  </div>
{/if}
<Scope />
