<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  import OLMap from 'ol/Map'
  import Feature from 'ol/Feature'
  import View from 'ol/View'
  import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
  import { Draw, Modify } from 'ol/interaction'
  import { Polygon } from 'ol/geom'
  import { Vector as VectorSource } from 'ol/source'
  import IIIF from 'ol/source/IIIF'
  import IIIFInfo, { type ImageInformationResponse } from 'ol/format/IIIFInfo'

  import { X as XIcon, Check as CheckIcon } from 'phosphor-svelte'

  import { generateId, generateRandomId } from '@allmaps/id'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getImageInfoState } from '$lib/state/image-info.svelte.js'

  import {
    resourceMaskToPolygon,
    getResourceMaskFromFeature,
    deleteCondition,
    editableResourceMaskStyle,
    makeFeatureActive
  } from '$lib/shared/openlayers.js'
  import { getResourceMask } from '$lib/shared/maps.js'
  import { polygonDifference } from '$lib/shared/geometry.js'
  import { MapsEvents } from '$lib/shared/maps-events.js'

  import type { VectorSourceEvent } from 'ol/source/Vector'
  import type { DrawEvent } from 'ol/interaction/Draw'
  import type { ModifyEvent } from 'ol/interaction/Modify'

  import type {
    DbImageService,
    DbMaps,
    DbMap,
    ResourceMask,
    InsertMapEvent,
    RemoveMapEvent,
    InsertResourceMaskPointEvent,
    ReplaceResourceMaskPointEvent,
    RemoveResourceMaskPointEvent
  } from '$lib/shared/types.js'

  let resourceOlMapTarget: HTMLDivElement
  let resourceOlMap: OLMap
  let resourceTileLayer: TileLayer<IIIF>
  let resourceVectorSource: VectorSource
  let resourceDraw: Draw
  let resourceModify: Modify

  let currentImageId = $state<string | undefined>(undefined)
  let isDrawing = $state(false)
  let canFinishDrawing = $state(false)
  let drawingFeature = $state<Feature<Polygon> | undefined>(undefined)

  let resourceMaskBeforeModify: ResourceMask | undefined

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const imageInfoState = getImageInfoState()

  function handleDrawStart(event: DrawEvent) {
    isDrawing = true
    drawingFeature = event.feature as Feature<Polygon>
    drawingFeature.on('change', handleDrawingFeatureGeometryChange)
  }

  function handleDrawingFeatureGeometryChange() {
    const geom = drawingFeature?.getGeometry()
    const coordinates = geom?.getCoordinates()[0] || []
    canFinishDrawing = coordinates.length > 4
  }

  function handleDrawEnd() {
    isDrawing = false
    drawingFeature = undefined
    canFinishDrawing = false
  }

  async function handleAddFeature(event: VectorSourceEvent) {
    const feature = event.feature
    if (feature) {
      if (feature.getId()) {
        return
      }

      const resourceMask = getResourceMaskFromFeature(
        feature as Feature<Polygon>
      )

      if (!resourceMask) {
        console.error('No resource mask!')
        return
      }

      const mapId = await generateRandomId()
      feature.setId(mapId)

      // TODO: don't order by index but by date!
      feature.setProperties({
        index: mapsState.mapsCount
      })

      const image = sourceState.activeImage

      if (!image) {
        console.error('No active image!')
        return
      }

      const allmapsId = await generateId(image.uri)

      let resourceType: DbImageService = 'ImageService1' as const
      if (image.majorVersion === 2) {
        resourceType = 'ImageService2' as const
      } else if (image.majorVersion === 3) {
        resourceType = 'ImageService3' as const
      }

      mapsState.insertMap({
        mapId,
        map: {
          id: mapId,
          version: 2,
          gcps: {},
          resource: {
            id: allmapsId,
            uri: image.uri,
            type: resourceType,
            width: image.width,
            height: image.height
          },
          resourceMask
        }
      })
    }
  }

  function handleModifyStart(event: ModifyEvent) {
    const feature = event.features.item(0)
    const featureId = feature.getId()

    if (!featureId) {
      throw new Error('Feature has no ID!')
    }

    const mapId = String(featureId)

    makeResourceMaskFeatureActive(mapId)

    if (feature) {
      resourceMaskBeforeModify = getResourceMaskFromFeature(
        feature as Feature<Polygon>
      )
    }
  }

  function handleModifyEnd(event: ModifyEvent) {
    if (!resourceMaskBeforeModify) {
      console.error('No resource mask before modify!')
      return
    }

    if (event.features.getLength() > 1) {
      console.error('Multiple masks edited at once!')
    } else if (event.features.getLength() === 0) {
      return
    }

    const feature = event.features.item(0)

    const resourceMaskAfterModify = getResourceMaskFromFeature(
      feature as Feature<Polygon>
    )

    if (!resourceMaskAfterModify) {
      console.error('No resource mask after modify!')
      return
    }

    const mapId = feature.getId()

    if (typeof mapId !== 'string') {
      console.error('Feature has an invalid ID!')
      return
    }

    const diff = polygonDifference(
      resourceMaskBeforeModify,
      resourceMaskAfterModify
    )

    if (diff) {
      const { operation, index, point } = diff

      if (operation === 'insert') {
        mapsState.insertResourceMaskPoint({
          mapId,
          index,
          point
        })
      } else if (operation === 'replace') {
        mapsState.replaceResourceMaskPoint({
          mapId,
          index,
          point
        })
      } else if (operation === 'remove') {
        mapsState.removeResourceMaskPoint({
          mapId,
          index
        })
      }
    }

    resourceMaskBeforeModify = undefined
  }

  function makeResourceMaskFeatureActive(mapId: string | undefined) {
    const features = resourceVectorSource.getFeatures()
    makeFeatureActive(features, mapId)
  }

  async function updateImage(imageId: string | undefined) {
    resourceVectorSource.clear()

    if (imageId) {
      const imageInfo = (await imageInfoState.fetchImageInfo(
        imageId
      )) as ImageInformationResponse

      const options = new IIIFInfo(imageInfo).getTileSourceOptions()
      if (options === undefined || options.version === undefined) {
        throw new Error('Data seems to be no valid IIIF image information.')
      }

      options.zDirection = -1
      const resourceIiifSource = new IIIF(options)
      resourceTileLayer.setSource(resourceIiifSource)

      const tileGrid = resourceIiifSource.getTileGrid()

      const extent = tileGrid?.getExtent()
      if (extent && tileGrid) {
        resourceOlMap.setView(
          new View({
            resolutions: tileGrid.getResolutions(),
            extent,
            constrainOnlyCenter: true
          })
        )

        resourceOlMap.getView().fit(tileGrid.getExtent(), {
          // TODO: move to settings file
          padding: [30 + 40 + 20, 10, 30 + 40 + 20, 10]
        })
      }
    }
  }

  function addMap(map: DbMap, index: number) {
    // TODO: don't order by index but by date!
    const feature = new Feature()
    feature.setGeometry(
      new Polygon(resourceMaskToPolygon(getResourceMask(map)))
    )
    feature.setProperties({
      index,
      active: map.id === mapsState.activeMapId
    })

    feature.setId(map.id)
    resourceVectorSource.addFeature(feature)
  }

  function initializeMaps(maps: DbMaps) {
    resourceVectorSource.clear()

    if (maps) {
      Object.values(maps).forEach(addMap)
    }

    currentImageId = mapsState.connectedImageId
  }

  function replaceFeatureFromState(mapId: string) {
    const feature = resourceVectorSource.getFeatureById(mapId)

    const map = mapsState?.maps?.[mapId]

    if (feature && map) {
      feature.setGeometry(
        new Polygon(resourceMaskToPolygon(getResourceMask(map)))
      )
    }
  }

  function handleInsertMap(event: InsertMapEvent) {
    addMap(event.detail.map, mapsState.mapsCount)
  }

  function handleRemoveMap(event: RemoveMapEvent) {
    const mapId = event.detail.mapId
    const feature = resourceVectorSource.getFeatureById(mapId)
    if (feature) {
      resourceVectorSource.removeFeature(feature)
    }
  }

  function handleInsertResourceMaskPoint(event: InsertResourceMaskPointEvent) {
    const mapId = event.detail.mapId
    replaceFeatureFromState(mapId)
  }

  function handleReplaceResourceMaskPoint(
    event: ReplaceResourceMaskPointEvent
  ) {
    const mapId = event.detail.mapId
    replaceFeatureFromState(mapId)
  }

  function handleRemoveResourceMaskPoint(event: RemoveResourceMaskPointEvent) {
    const mapId = event.detail.mapId
    replaceFeatureFromState(mapId)
  }

  function abortDrawing() {
    resourceDraw?.abortDrawing()
  }

  function finishDrawing() {
    if (canFinishDrawing) {
      resourceDraw?.finishDrawing()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      abortDrawing()
    }
  }

  onMount(() => {
    resourceTileLayer = new TileLayer()
    resourceVectorSource = new VectorSource()

    const resourceVectorLayer = new VectorLayer({
      source: resourceVectorSource,
      style: editableResourceMaskStyle
    })

    resourceOlMap = new OLMap({
      layers: [resourceTileLayer, resourceVectorLayer],
      target: resourceOlMapTarget,
      controls: []
    })

    resourceModify = new Modify({
      source: resourceVectorSource,
      pixelTolerance: 25,
      deleteCondition
    })

    resourceDraw = new Draw({
      source: resourceVectorSource,
      type: 'Polygon',
      freehandCondition: () => false
    })

    resourceDraw.on('drawstart', handleDrawStart)
    resourceDraw.on('drawend', handleDrawEnd)
    resourceDraw.on('drawabort', handleDrawEnd)
    resourceVectorSource.on('addfeature', handleAddFeature)
    resourceModify.on('modifystart', handleModifyStart)
    resourceModify.on('modifyend', handleModifyEnd)

    $effect(() => {
      if (mapsState.connected) {
        resourceOlMap.addInteraction(resourceDraw)
        resourceOlMap.addInteraction(resourceModify)
      } else {
        resourceOlMap.removeInteraction(resourceDraw)
        resourceOlMap.removeInteraction(resourceModify)
      }
    })

    $effect(() => {
      if (sourceState.activeImageId) {
        abortDrawing()
        updateImage(sourceState.activeImageId)
      }
    })

    $effect(() => {
      if (mapsState.activeMapId) {
        makeResourceMaskFeatureActive(mapsState.activeMapId)
      }
    })

    $effect(() => {
      if (
        mapsState.connected === true &&
        mapsState.maps &&
        mapsState.connectedImageId !== currentImageId
      ) {
        initializeMaps(mapsState.maps)
      }
    })

    mapsState.addEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
    mapsState.addEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

    mapsState.addEventListener(
      MapsEvents.INSERT_RESOURCE_MASK_POINT,
      handleInsertResourceMaskPoint
    )
    mapsState.addEventListener(
      MapsEvents.REPLACE_RESOURCE_MASK_POINT,
      handleReplaceResourceMaskPoint
    )
    mapsState.addEventListener(
      MapsEvents.REMOVE_RESOURCE_MASK_POINT,
      handleRemoveResourceMaskPoint
    )

    return () => {
      mapsState.removeEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
      mapsState.removeEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

      mapsState.removeEventListener(
        MapsEvents.INSERT_RESOURCE_MASK_POINT,
        handleInsertResourceMaskPoint
      )
      mapsState.removeEventListener(
        MapsEvents.REPLACE_RESOURCE_MASK_POINT,
        handleReplaceResourceMaskPoint
      )
      mapsState.removeEventListener(
        MapsEvents.REMOVE_RESOURCE_MASK_POINT,
        handleRemoveResourceMaskPoint
      )
    }
  })
</script>

<svelte:body onkeydown={handleKeydown} />

<div bind:this={resourceOlMapTarget} class="w-full h-full">
  {#if isDrawing}
    <div
      transition:fade={{ duration: 50 }}
      class="absolute top-16 w-full flex justify-center gap-2"
    >
      <button
        onclick={abortDrawing}
        class="bg-red z-50 p-2 rounded-md text-sm flex items-center gap-1"
      >
        <XIcon class="size-4" weight="bold" />
        <span>Cancel</span>
      </button>

      <button
        onclick={finishDrawing}
        disabled={!canFinishDrawing}
        class="bg-green z-50 p-2 rounded-md text-sm flex items-center gap-1 transition-opacity disabled:opacity-50"
      >
        <CheckIcon class="size-4" weight="bold" />
        <span>Finish</span>
      </button>
    </div>
  {/if}
</div>
