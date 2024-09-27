<script lang="ts">
  import { onMount } from 'svelte'

  import type { SelectEvent } from 'ol/interaction/Select.js'
  import type { FeatureLike } from 'ol/Feature.js'

  import {
    mapOl,
    mapWarpedMapLayer,
    mapVectorSource,
    mapSelect
  } from '$lib/shared/stores/openlayers.js'
  import { sourceLoading, sourcesCount } from '$lib/shared/stores/sources.js'
  import { activeMap } from '$lib/shared/stores/active.js'
  import {
    selectedMaps,
    updateSelectedMaps
  } from '$lib/shared/stores/selected.js'

  import { idsFromFeatures } from '$lib/shared/openlayers.js'

  import MapContextMenu from '$lib/components/dropdowns/MapContextMenu.svelte'
  import HiddenWarpedMap from '$lib/components/elements/HiddenWarpedMap.svelte'

  import type { FeatureContextMenu } from '$lib/shared/types.js'

  let ol: HTMLElement
  let featureContextMenu: FeatureContextMenu | undefined

  function fitExtent() {
    const extent = mapWarpedMapLayer.getExtent()
    if (extent && mapOl) {
      mapOl.getView().fit(extent, {
        padding: [25, 25, 25, 25]
      })
    }
  }

  $: {
    if (!$sourceLoading && $sourcesCount > 0) {
      fitExtent()
    }
  }

  $: {
    if (mapOl && $activeMap && $activeMap.updateView) {
      const warpedMap = mapWarpedMapLayer.getWarpedMap(
        $activeMap.viewerMap.mapId
      )
      if (warpedMap) {
        mapOl.getView().fit(warpedMap.projectedGeoMaskBbox, {
          duration: 200,
          padding: [25, 25, 25, 25]
        })
      }
    }
  }

  function handleSelect(event: SelectEvent) {
    const selectedMapIds = idsFromFeatures(event.selected)
    const deselectedMapIds = idsFromFeatures(event.deselected)

    updateSelectedMaps(selectedMapIds, deselectedMapIds, false)
  }

  function showContextMenu(event: MouseEvent, feature: FeatureLike) {
    featureContextMenu = {
      event,
      feature
    }
  }

  function hideContextMenu() {
    featureContextMenu = undefined
  }

  onMount(() => {
    mapOl?.setTarget(ol)
    mapSelect?.on('select', handleSelect)

    ol.addEventListener('contextmenu', (event) => {
      if (mapOl) {
        event.preventDefault()

        // TODO: use selected maps
        const feature = mapOl.forEachFeatureAtPixel(
          mapOl.getEventPixel(event),
          (feature) => feature
        )

        if (feature) {
          showContextMenu(event, feature)
        }
      }
    })

    mapOl?.on('movestart', hideContextMenu)

    fitExtent()

    return () => {
      mapSelect?.un('select', handleSelect)
      mapOl?.un('movestart', hideContextMenu)
      mapOl?.setTarget()
    }
  })
</script>

<div id="ol" bind:this={ol} class="w-full h-full"></div>
{#if featureContextMenu}
  <MapContextMenu {featureContextMenu} />
{/if}
{#if mapVectorSource && mapSelect}
  <div class="hidden">
    <ol>
      {#each $selectedMaps as viewerMap (viewerMap.mapId)}
        <li>
          <HiddenWarpedMap
            vectorSource={mapVectorSource}
            select={mapSelect}
            {viewerMap}
          />
        </li>
      {/each}
    </ol>
  </div>
{/if}

<svelte:window on:keypress={hideContextMenu} on:click={hideContextMenu} />
