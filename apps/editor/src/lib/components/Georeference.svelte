<script lang="ts">
  import { onMount } from 'svelte'

  import OLMap from 'ol/Map'
  import Feature from 'ol/Feature'
  import View from 'ol/View'
  import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
  import XYZ from 'ol/source/XYZ'
  import { Draw, Modify } from 'ol/interaction'
  import { Geometry, Polygon, Point as OLPoint } from 'ol/geom'
  import { Vector as VectorSource } from 'ol/source'
  import IIIF from 'ol/source/IIIF'
  import IIIFInfo, { type ImageInformationResponse } from 'ol/format/IIIFInfo'
  import { fromLonLat, toLonLat } from 'ol/proj'

  import { generateRandomId } from '@allmaps/id'
  import { WarpedMapLayer } from '@allmaps/openlayers'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getImageInfoState } from '$lib/state/image-info.svelte.js'

  import {
    resourceMaskStyle,
    gcpStyle,
    deleteCondition,
    getResourceMaskPolygon,
    getGeoMaskPolygon,
    makeFeatureActive
  } from '$lib/shared/openlayers.js'
  import {
    getGcpResourcePoint,
    getGcpGeoPoint,
    createMapWithFullImageResourceMask
  } from '$lib/shared/maps.js'
  import { roundWithDecimals } from '$lib/shared/math.js'
  import { MapsEvents } from '$lib/shared/maps-events.js'

  import type { VectorSourceEvent } from 'ol/source/Vector'
  import type { ModifyEvent } from 'ol/interaction/Modify'

  import type {
    DbMaps,
    DbMap,
    DbGcp,
    DbGcp2,
    Point,
    InsertMapEvent,
    RemoveMapEvent,
    InsertGcpEvent,
    ReplaceGcpEvent,
    RemoveGcpEvent,
    InsertResourceMaskPointEvent,
    ReplaceResourceMaskPointEvent,
    RemoveResourceMaskPointEvent
  } from '$lib/shared/types.js'

  let resourceOlMapTarget: HTMLDivElement
  let geoOlMapTarget: HTMLDivElement

  let resourceOlMap: OLMap
  let geoOlMap: OLMap

  let resourceTileLayer: TileLayer<IIIF>
  let resourceGcpVectorSource: VectorSource<Feature<OLPoint>>
  let resourceMaskVectorSource: VectorSource<Feature<Polygon>>

  let resourceDraw: Draw
  let resourceModify: Modify

  let geoTileLayer: TileLayer<XYZ>
  let warpedMapLayer: WarpedMapLayer
  let geoGcpVectorSource: VectorSource<Feature<OLPoint>>
  let geoMaskVectorSource: VectorSource<Feature<Polygon>>

  let geoDraw: Draw
  let geoModify: Modify

  let currentImageId = $state<string | undefined>(undefined)
  let currentActiveMapId: string | undefined

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const uiState = getUiState()
  const imageInfoState = getImageInfoState()

  function getFirstGcpWithMissingResourcePoint(incompleteGcps: DbGcp2[]) {
    // TODO: take order into account, by index or by date
    return incompleteGcps.find((gcp) => !getGcpResourcePoint(gcp))
  }

  function getFirstGcpWithMissingGeoPoint(incompleteGcps: DbGcp2[]) {
    // TODO: take order into account, by index or by date
    return incompleteGcps.find((gcp) => !getGcpGeoPoint(gcp))
  }

  function resourceFeatureToPoint(
    feature: Feature<OLPoint>
  ): Point | undefined {
    const geometry = feature.getGeometry()

    if (geometry) {
      const coordinates = geometry.getCoordinates()
      return [Math.round(coordinates[0]), Math.round(-coordinates[1])]
    }
  }

  function geoFeatureToPoint(feature: Feature<OLPoint>): Point | undefined {
    const geometry = feature.getGeometry()

    if (geometry) {
      const coordinates = toLonLat(geometry.getCoordinates())

      // 7 decimal places should be enough...
      // See https://gis.stackexchange.com/questions/8650/measuring-accuracy-of-latitude-and-longitude
      return [
        roundWithDecimals(coordinates[0], 7),
        roundWithDecimals(coordinates[1], 7)
      ]
    }
  }

  function pointToResourceGeometry(point: Point) {
    return new OLPoint([point[0], -point[1]])
  }

  function pointToGeoGeometry(point: Point) {
    return new OLPoint(fromLonLat(point))
  }

  function gcpFromGcpId(gcpId: string): DbGcp2 | undefined {
    const resourceFeature = resourceGcpVectorSource.getFeatureById(gcpId)
    const geoFeature = geoGcpVectorSource.getFeatureById(gcpId)

    let resourcePoint
    let geoPoint

    if (resourceFeature) {
      resourcePoint = resourceFeatureToPoint(resourceFeature)
    }

    if (geoFeature) {
      geoPoint = geoFeatureToPoint(geoFeature)
    }

    if (resourcePoint || geoPoint) {
      return {
        id: gcpId,
        // TODO: order:
        resource: resourcePoint,
        geo: geoPoint
      }
    }

    console.error(`Cannot create GCP for ${gcpId}`)
  }

  async function updateImage(imageId: string | undefined) {
    resourceGcpVectorSource.clear()
    geoGcpVectorSource.clear()

    resourceMaskVectorSource.clear()
    geoMaskVectorSource.clear()

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

  function addGcp(gcp: DbGcp, index: number) {
    const resourcePoint = getGcpResourcePoint(gcp)
    const geoPoint = getGcpGeoPoint(gcp)

    // TODO: don't order by index but by date!
    if (resourcePoint) {
      const resourceFeature = new Feature({
        index,
        geometry: pointToResourceGeometry(resourcePoint)
      })
      resourceFeature.setId(gcp.id)
      resourceGcpVectorSource.addFeature(resourceFeature)
    }

    if (geoPoint) {
      const geoFeature = new Feature({
        index,
        geometry: pointToGeoGeometry(geoPoint)
      })
      geoFeature.setId(gcp.id)
      geoGcpVectorSource.addFeature(geoFeature)
    }
  }

  function setGcps(map: DbMap) {
    resourceGcpVectorSource.clear()
    geoGcpVectorSource.clear()

    Object.values(map.gcps).forEach(addGcp)

    if (resourceGcpVectorSource.getFeatures().length) {
      const resourceExtent = resourceGcpVectorSource.getExtent()
      resourceOlMap.getView().fit(resourceExtent, {
        padding: [30 + 40 + 20, 10, 30 + 40 + 20, 10]
      })
    }

    if (geoGcpVectorSource.getFeatures().length) {
      const geoExtent = geoGcpVectorSource.getExtent()
      geoOlMap.getView().fit(geoExtent, {
        padding: [30 + 40 + 20, 10, 30 + 40 + 20, 10]
      })
    }
  }

  function initializeMaps(maps: DbMaps) {
    resourceMaskVectorSource.clear()
    geoMaskVectorSource.clear()

    if (maps) {
      Object.values(maps).forEach(addMap)
    }

    currentImageId = mapsState.connectedImageId
  }

  function addMap(map: DbMap) {
    const resourceMaskPolygon = getResourceMaskPolygon(map)
    const geoMaskPolygon = getGeoMaskPolygon(map)

    if (resourceMaskPolygon) {
      const resourceMaskFeature = new Feature({
        geometry: resourceMaskPolygon
      })
      resourceMaskFeature.setId(map.id)
      resourceMaskVectorSource.addFeature(resourceMaskFeature)
    }

    if (geoMaskPolygon) {
      const geoMaskFeature = new Feature({
        geometry: geoMaskPolygon
      })
      geoMaskFeature.setId(map.id)
      geoMaskVectorSource.addFeature(geoMaskFeature)
    }
  }

  function removeMap(mapId: string) {
    const resourceMaskFeature = resourceMaskVectorSource.getFeatureById(mapId)
    if (resourceMaskFeature) {
      resourceMaskVectorSource.removeFeature(resourceMaskFeature)
    }

    const geoMaskFeature = geoMaskVectorSource.getFeatureById(mapId)
    if (geoMaskFeature) {
      geoMaskVectorSource.removeFeature(geoMaskFeature)
    }
  }

  function replaceMapFromState(mapId: string) {
    const map = mapsState.getMapById(mapId)
    if (map) {
      const resourceMaskPolygon = getResourceMaskPolygon(map)
      const geoMaskPolygon = getGeoMaskPolygon(map)

      if (resourceMaskPolygon) {
        const resourceMaskFeature =
          resourceMaskVectorSource.getFeatureById(mapId)
        resourceMaskFeature?.setGeometry(resourceMaskPolygon)
      }

      if (geoMaskPolygon) {
        const geoMaskFeature = geoMaskVectorSource.getFeatureById(mapId)
        geoMaskFeature?.setGeometry(geoMaskPolygon)
      }
    }
  }

  function replaceGcpFromState(gcpId: string) {
    const gcp = mapsState.activeMap?.gcps[gcpId]

    if (gcp) {
      let index = 0
      const resourceGcpFeature = resourceGcpVectorSource.getFeatureById(gcpId)
      if (resourceGcpFeature) {
        index = resourceGcpFeature.getProperties().index
        resourceGcpVectorSource.removeFeature(resourceGcpFeature)
      }

      const geoGcpFeature = geoGcpVectorSource.getFeatureById(gcpId)
      if (geoGcpFeature) {
        index = geoGcpFeature.getProperties().index
        geoGcpVectorSource.removeFeature(geoGcpFeature)
      }

      addGcp(gcp, index)
    } else {
      console.error(`Error setting new geometries for GCP ${gcpId}`)
    }
  }

  function handleInsertMap(event: InsertMapEvent) {
    addMap(event.detail.map)
  }

  function handleRemoveMap(event: RemoveMapEvent) {
    const mapId = event.detail.mapId
    removeMap(mapId)
  }

  function handleInsertGcp(event: InsertGcpEvent) {
    const mapId = event.detail.mapId
    if (mapId === currentActiveMapId) {
      let index = 0
      const gcps = mapsState.activeMap?.gcps

      if (gcps) {
        const gcpCount = Object.values(gcps).length
        index = gcpCount
      }

      addGcp(event.detail.gcp, index)
    }

    replaceMapFromState(mapId)
  }

  function handleReplaceGcp(event: ReplaceGcpEvent) {
    const mapId = event.detail.mapId
    if (mapId === currentActiveMapId) {
      const gcpId = event.detail.gcpId
      replaceGcpFromState(gcpId)
    }

    replaceMapFromState(mapId)
  }

  function handleRemoveGcp(event: RemoveGcpEvent) {
    const mapId = event.detail.mapId
    if (mapId === currentActiveMapId) {
      const gcpId = event.detail.gcpId

      const resourceGcpFeature = resourceGcpVectorSource.getFeatureById(gcpId)
      if (resourceGcpFeature) {
        resourceGcpVectorSource.removeFeature(resourceGcpFeature)
      }

      const geoGcpFeature = geoGcpVectorSource.getFeatureById(gcpId)
      if (geoGcpFeature) {
        geoGcpVectorSource.removeFeature(geoGcpFeature)
      }
    }

    replaceMapFromState(mapId)
  }

  function handleInsertResourceMaskPoint(event: InsertResourceMaskPointEvent) {
    const mapId = event.detail.mapId
    replaceMapFromState(mapId)
  }

  function handleReplaceResourceMaskPoint(
    event: ReplaceResourceMaskPointEvent
  ) {
    const mapId = event.detail.mapId
    replaceMapFromState(mapId)
  }

  function handleRemoveResourceMaskPoint(event: RemoveResourceMaskPointEvent) {
    const mapId = event.detail.mapId
    replaceMapFromState(mapId)
  }

  async function handleAddGcpFeature(event: VectorSourceEvent) {
    const feature = event.feature as Feature<OLPoint>

    if (!feature || feature.getId()) {
      return
    }

    let gcpId: string | undefined
    let newGcpId: boolean

    const incompleteGcps = mapsState.incompleteGcps

    if (incompleteGcps.length) {
      if (event.target === resourceGcpVectorSource) {
        if (mapsState.activeGcp && !getGcpResourcePoint(mapsState.activeGcp)) {
          gcpId = mapsState.activeGcp.id
        } else {
          const gcp = getFirstGcpWithMissingResourcePoint(incompleteGcps)
          gcpId = gcp?.id
        }
      } else {
        if (mapsState.activeGcp && !getGcpGeoPoint(mapsState.activeGcp)) {
          gcpId = mapsState.activeGcp.id
        } else {
          const gcp = getFirstGcpWithMissingGeoPoint(incompleteGcps)
          gcpId = gcp?.id
        }
      }
    }

    if (gcpId) {
      newGcpId = false
    } else {
      newGcpId = true
      gcpId = await generateRandomId()
    }

    feature.setId(gcpId)

    // TODO: set order
    let index
    if (event.target === resourceGcpVectorSource) {
      index = resourceGcpVectorSource.getFeatures().length - 1
    } else {
      index = geoGcpVectorSource.getFeatures().length - 1
    }

    feature.setProperties({
      index
    })

    const gcp = gcpFromGcpId(gcpId)

    if (!gcp) {
      throw new Error(`Can't find GCP ${gcpId}`)
    }

    if (mapsState.activeMapId) {
      const mapId = mapsState.activeMapId
      if (newGcpId) {
        mapsState.insertGcp({ mapId, gcpId, gcp })
      } else {
        mapsState.replaceGcp({ mapId, gcpId, gcp })
      }
    } else if (sourceState.activeImage) {
      const map = {
        ...(await createMapWithFullImageResourceMask(sourceState.activeImage)),
        gcps: {
          [gcpId]: gcp
        }
      }

      mapsState.insertMap({
        mapId: map.id,
        map
      })
    }
  }

  function handleModifyEnd(event: ModifyEvent) {
    const mapId = mapsState.activeMapId
    const feature = event.features.item(0)
    const gcpId = feature.getId()
    if (mapId && gcpId && typeof gcpId === 'string') {
      const gcp = gcpFromGcpId(gcpId)
      if (gcp) {
        mapsState.replaceGcp({ mapId, gcpId, gcp })
      }
    } else {
      console.error('GCP without ID encountered')
    }
  }

  function abortDrawing() {
    resourceDraw.abortDrawing()
    geoDraw.abortDrawing()
  }

  function makeResourceMaskFeatureActive(mapId: string | undefined) {
    const resourceMaskfeatures = resourceMaskVectorSource.getFeatures()
    const geoMaskfeatures = geoMaskVectorSource.getFeatures()

    makeFeatureActive(resourceMaskfeatures, mapId)
    makeFeatureActive(geoMaskfeatures, mapId)
  }

  function makeGcpFeatureActive(gcpId: string | undefined) {
    const resourceGcpFeatures = resourceGcpVectorSource.getFeatures()
    const geoGcpFeatures = geoGcpVectorSource.getFeatures()

    makeFeatureActive(resourceGcpFeatures, gcpId)
    makeFeatureActive(geoGcpFeatures, gcpId)
  }

  onMount(() => {
    // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    // Left pane: resource
    // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    resourceTileLayer = new TileLayer()
    resourceGcpVectorSource = new VectorSource()

    const resourceVectorLayer = new VectorLayer({
      source: resourceGcpVectorSource,
      style: gcpStyle
    })

    resourceMaskVectorSource = new VectorSource()

    const resourceResourceMaskLayer = new VectorLayer({
      source: resourceMaskVectorSource,
      style: resourceMaskStyle
    })

    resourceOlMap = new OLMap({
      layers: [
        resourceTileLayer,
        resourceResourceMaskLayer,
        resourceVectorLayer
      ],
      target: resourceOlMapTarget,
      controls: []
    })

    resourceModify = new Modify({
      // TODO: is there a better way to do this?
      source: resourceGcpVectorSource as unknown as VectorSource<
        Feature<Geometry>
      >,
      pixelTolerance: 25,
      deleteCondition
    })

    resourceDraw = new Draw({
      // TODO: is there a better way to do this?
      source: resourceGcpVectorSource as unknown as VectorSource<
        Feature<Geometry>
      >,
      type: 'Point'
    })

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // Right pane: geospatial
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    const geoTileSource = new XYZ({
      url: uiState.presetBaseMap.url,
      attributions: uiState.presetBaseMap.attribution,
      maxZoom: 19
    })

    geoTileLayer = new TileLayer({
      source: geoTileSource
    })

    warpedMapLayer = new WarpedMapLayer()

    geoGcpVectorSource = new VectorSource()

    const geoVectorLayer = new VectorLayer({
      source: geoGcpVectorSource,
      style: gcpStyle
    })

    geoMaskVectorSource = new VectorSource()

    const geoResourceMaskLayer = new VectorLayer({
      source: geoMaskVectorSource,
      style: resourceMaskStyle
    })

    geoOlMap = new OLMap({
      layers: [
        geoTileLayer,
        // @ts-expect-error @allmaps/openlayers does not yet include types for multiple OpenLayers version
        warpedMapLayer,
        geoResourceMaskLayer,
        geoVectorLayer
      ],
      target: geoOlMapTarget,
      view: new View({
        center: fromLonLat([0, 0]),
        zoom: 2,
        maxZoom: 22
      }),
      controls: []
    })

    geoModify = new Modify({
      // TODO: is there a better way to do this?
      source: geoGcpVectorSource as unknown as VectorSource<Feature<Geometry>>,
      pixelTolerance: 25,
      deleteCondition
    })

    geoDraw = new Draw({
      // TODO: is there a better way to do this?
      source: geoGcpVectorSource as unknown as VectorSource<Feature<Geometry>>,
      type: 'Point'
    })

    // ========================================================================
    // Effects
    // ========================================================================

    $effect(() => {
      if (sourceState.activeImageId) {
        abortDrawing()
        updateImage(sourceState.activeImageId)
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

    $effect(() => {
      if (mapsState.activeMapId !== currentActiveMapId && mapsState.activeMap) {
        abortDrawing()
        setGcps(mapsState.activeMap)
        makeResourceMaskFeatureActive(mapsState.activeMapId)

        currentActiveMapId = mapsState.activeMapId
      }
    })

    $effect(() => {
      if (mapsState.activeGcpId) {
        makeGcpFeatureActive(mapsState.activeGcpId)
      }
    })

    $effect(() => {
      warpedMapLayer.clear()
      if (uiState.userGeoreferenceAnnotationUrl) {
        warpedMapLayer.addGeoreferenceAnnotationByUrl(
          uiState.userGeoreferenceAnnotationUrl
        )
      }
    })

    $effect(() => {
      if (uiState.userBaseMapUrl || uiState.presetBaseMap) {
        geoTileSource.setUrl(
          uiState.userBaseMapUrl || uiState.presetBaseMap.url
        )
        if (uiState.presetBaseMap) {
          geoTileSource.setAttributions(uiState.presetBaseMap.attribution)
        } else {
          geoTileSource.setAttributions(undefined)
        }
      }
    })

    // ========================================================================
    // Events
    // ========================================================================

    resourceGcpVectorSource.on('addfeature', handleAddGcpFeature)
    geoGcpVectorSource.on('addfeature', handleAddGcpFeature)

    resourceModify.on('modifyend', handleModifyEnd)
    geoModify.on('modifyend', handleModifyEnd)

    mapsState.addEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
    mapsState.addEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

    mapsState.addEventListener(MapsEvents.INSERT_GCP, handleInsertGcp)
    mapsState.addEventListener(MapsEvents.REPLACE_GCP, handleReplaceGcp)
    mapsState.addEventListener(MapsEvents.REMOVE_GCP, handleRemoveGcp)

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

    $effect(() => {
      if (mapsState.connected) {
        resourceOlMap.addInteraction(resourceDraw)
        resourceOlMap.addInteraction(resourceModify)

        geoOlMap.addInteraction(geoDraw)
        geoOlMap.addInteraction(geoModify)
      } else {
        resourceOlMap.removeInteraction(resourceDraw)
        resourceOlMap.removeInteraction(resourceModify)

        geoOlMap.removeInteraction(geoDraw)
        geoOlMap.removeInteraction(geoModify)
      }
    })

    return () => {
      mapsState.removeEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
      mapsState.removeEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

      mapsState.removeEventListener(MapsEvents.INSERT_GCP, handleInsertGcp)
      mapsState.removeEventListener(MapsEvents.REPLACE_GCP, handleReplaceGcp)
      mapsState.removeEventListener(MapsEvents.REMOVE_GCP, handleRemoveGcp)

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

<div class="w-full h-full grid grid-rows-2 sm:grid-rows-1 sm:grid-cols-2">
  <div bind:this={resourceOlMapTarget} class="w-full h-full"></div>
  <div bind:this={geoOlMapTarget} class="w-full h-full"></div>
</div>
