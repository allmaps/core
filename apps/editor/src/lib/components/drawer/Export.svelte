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
    <a
      class="inline-block p-2 rounded-md text-white bg-pink hover:bg-pink-400 transition-colors"
      href={getViewerUrl(type, allmapsId)}>View in Allmaps Viewer</a
    >
  </div>

  <div>URLs:</div>

  <div class="grid grid-cols-[max-content,1fr] gap-2 [&>*]:break-all">
    <div>Georeference Annotation:</div>
    <a class="underline" href={getAnnotationUrl(type, allmapsId)}
      >{getAnnotationUrl(type, allmapsId)}</a
    >
    <div>GeoJSON:</div>
    <a class="underline" href={getGeoJsonUrl(type, allmapsId)}
      >{getGeoJsonUrl(type, allmapsId)}</a
    >
    <div>XYZ map tiles:</div>
    <a class="underline" href={getXyzTilesUrl(type, allmapsId)}
      >{getXyzTilesUrl(type, allmapsId)}</a
    >
    <!-- TODO: add GeoTIFF script -->
    <!-- TODO: add code for OpenLayers/Leaflet/MapLibre plugins -->
  </div>
{/if}
<Scope />
