<script lang="ts">
  import { onMount } from 'svelte'

  import Feature from 'ol/Feature.js'
  import Polygon from 'ol/geom/Polygon.js'

  import { fetchImageInfo } from '@allmaps/stdlib'

  import {
    imageInformations,
    imageOl,
    imageIiifLayer,
    imageVectorSource
  } from '$lib/shared/stores/openlayers.js'
  import { activeMap } from '$lib/shared/stores/active.js'

  import { maskToPolygon } from '$lib/shared/openlayers.js'

  import { computeBbox } from '@allmaps/stdlib'

  import type { ImageInformationResponse } from 'ol/format/IIIFInfo.js'

  import type { ViewerMap } from '$lib/shared/types.js'

  $: {
    if (imageOl && $activeMap) {
      updateMap($activeMap.viewerMap)
    }
  }

  function updateVectorSource(viewerMap: ViewerMap) {
    const map = viewerMap.map

    const feature = new Feature({
      index: 0,
      geometry: new Polygon(maskToPolygon(map.resourceMask))
    })

    feature.setId(map.id)

    imageVectorSource.clear()
    imageVectorSource.addFeature(feature)
  }

  async function updateMap(viewerMap: ViewerMap) {
    if (imageOl && imageIiifLayer) {
      updateVectorSource(viewerMap)

      const map = viewerMap.map

      const imageUri = map.resource.id

      let imageInfo

      // TODO: move to function
      if (imageInformations.has(imageUri)) {
        imageInfo = imageInformations.get(imageUri)
      } else {
        imageInfo = await fetchImageInfo(imageUri, { cache: 'force-cache' })
        imageInformations.set(imageUri, imageInfo)
      }

      imageIiifLayer.setImageInfo(imageInfo as ImageInformationResponse)

      const resourceMaskBbox = computeBbox(viewerMap.map.resourceMask)
      const iiifLayerresourceMaskBbox = [
        resourceMaskBbox[0],
        -resourceMaskBbox[3],
        resourceMaskBbox[2],
        -resourceMaskBbox[1]
      ]

      imageOl.getView().fit(iiifLayerresourceMaskBbox, {
        padding: [25, 25, 25, 25]
      })
    }
  }

  onMount(() => {
    imageOl?.setTarget('ol')

    return () => {
      imageOl?.setTarget()
    }
  })
</script>

<div id="ol" class="w-full h-full"></div>
