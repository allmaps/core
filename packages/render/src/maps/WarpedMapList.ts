import { generateChecksum } from '@allmaps/id'
import {
  parseAnnotation,
  validateMap,
  type Map as GeoreferencedMap
} from '@allmaps/annotation'

import RTree from './RTree.js'
import WarpedMap from './WarpedMap.js'

import { bboxToCenter, combineBboxes, convexHull } from '@allmaps/stdlib'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type {
  TransformationOptions,
  WarpedMapFactory,
  WarpedMapListOptions
} from '../shared/types.js'

import type { DistortionMeasure, TransformationType } from '@allmaps/transform'
import type {
  Ring,
  Bbox,
  Point,
  FetchFn,
  ImageInformations
} from '@allmaps/types'

function createDefaultWarpedMapListOptions(): Partial<WarpedMapListOptions> {
  return {
    createRTree: true,
    imageInformations: new Map()
  }
}

/**
 * An ordered list of WarpedMaps. This class contains an optional RTree
 * for quickly looking up maps using their Bbox.
 *
 * @export
 * @class WarpedMapList
 * @template {WarpedMap} W
 * @typedef {WarpedMapList<W>}
 * @extends {EventTarget}
 */
export default class WarpedMapList<W extends WarpedMap> extends EventTarget {
  warpedMapFactory: WarpedMapFactory<W>
  warpedMapsById: Map<string, W> = new Map()

  zIndices: Map<string, number> = new Map()
  rtree?: RTree
  imageInformations?: ImageInformations
  transformation?: TransformationOptions

  fetchFn?: FetchFn

  /**
   * Creates an instance of a WarpedMapList.
   *
   * @constructor
   * @param {WarpedMapFactory<W>} [warpedMapFactory] - Factory function for creating WarpedMap objects
   * @param {WarpedMapListOptions} [options] - Options
   */
  constructor(
    warpedMapFactory: WarpedMapFactory<W>,
    options?: Partial<WarpedMapListOptions>
  ) {
    super()

    this.warpedMapFactory = warpedMapFactory

    options = {
      ...createDefaultWarpedMapListOptions(),
      ...options
    }

    this.fetchFn = options?.fetchFn

    this.imageInformations = options.imageInformations
    this.transformation = options.transformation

    if (options.createRTree) {
      this.rtree = new RTree()
    }
  }

  /**
   * Returns mapIds for the maps in this list.
   *
   * @returns {Iterable<string>}
   */
  getMapIds(): Iterable<string> {
    return this.warpedMapsById.keys()
  }

  /**
   * Returns WarpedMap objects of the maps in this list.
   * Optionally specify mapIds whose WarpedMap objects are requested.
   *
   * @returns {Iterable<W>}
   */
  getWarpedMaps(): Iterable<W>
  getWarpedMaps(mapIds?: Iterable<string>): Iterable<W>
  getWarpedMaps(mapIds?: Iterable<string>): Iterable<W> {
    if (mapIds === undefined) {
      return this.warpedMapsById.values()
    } else {
      const warpedMaps: W[] = []
      for (const mapId of mapIds) {
        const warpedMap = this.warpedMapsById.get(mapId)
        if (warpedMap) {
          warpedMaps.push(warpedMap)
        }
      }
      return warpedMaps
    }
  }

  /**
   * Returns the WarpedMap object in this list of map specified by its ID.
   *
   * @param {string} mapId
   * @returns {(W | undefined)}
   */
  getWarpedMap(mapId: string): W | undefined {
    return this.warpedMapsById.get(mapId)
  }

  /**
   * Returns the z-index of a map.
   *
   * @param {string} mapId
   * @returns {number | undefined}
   */
  getMapZIndex(mapId: string): number | undefined {
    return this.zIndices.get(mapId)
  }

  getCenter(): Point | undefined {
    const bbox = this.getBbox()
    if (bbox) {
      return bboxToCenter(bbox)
    }
  }

  getProjectedCenter(): Point | undefined {
    const bbox = this.getProjectedBbox()
    if (bbox) {
      return bboxToCenter(bbox)
    }
  }

  /**
   * Return the bounding box of all visible maps in this list, in geospatial coordinates ('WGS84', i.e. `[lon, lat]`)
   *
   * Returns undefined if the list is empty.
   *
   * @returns {(Bbox | undefined)}
   */
  getBbox(mapIds?: Iterable<string>): Bbox | undefined {
    const bboxes = []

    for (const warpedMap of this.getWarpedMaps(mapIds)) {
      if (warpedMap.visible) {
        bboxes.push(warpedMap.geoMaskBbox)
      }
    }

    return combineBboxes(...bboxes)
  }

  /**
   * Return the bounding box of all visible maps in this list, in projected geospatial coordinates
   *
   * Returns undefined if the list is empty.
   *
   * @returns {(Bbox | undefined)}
   */
  getProjectedBbox(mapIds?: Iterable<string>): Bbox | undefined {
    const bboxes = []

    for (const warpedMap of this.getWarpedMaps(mapIds)) {
      if (warpedMap.visible) {
        bboxes.push(warpedMap.projectedGeoMaskBbox)
      }
    }

    return combineBboxes(...bboxes)
  }

  /**
   * Return the convex hull of all visible maps in this list, in geospatial coordinates ('WGS84', i.e. `[lon, lat]`)
   *
   * Returns undefined if the list is empty.
   *
   * @returns {(Ring | undefined)}
   */
  getConvexHull(mapIds?: Iterable<string>): Ring | undefined {
    const maskPoints: Point[] = []

    for (const warpedMap of this.getWarpedMaps(mapIds)) {
      if (warpedMap.visible) {
        maskPoints.push(...warpedMap.geoMask.coordinates[0])
      }
    }

    return convexHull(maskPoints)
  }

  /**
   * Return the convex hull of all visible maps in this list, in projected geospatial coordinates
   *
   * Returns undefined if the list is empty.
   *
   * @returns {(Ring | undefined)}
   */
  getProjectedConvexHull(mapIds?: Iterable<string>): Ring | undefined {
    const maskPoints: Point[] = []

    for (const warpedMap of this.getWarpedMaps(mapIds)) {
      if (warpedMap.visible) {
        maskPoints.push(...warpedMap.projectedGeoMask)
      }
    }

    return convexHull(maskPoints)
  }

  /**
   * Returns mapIds of the maps whose geoBbox overlaps with the specified geoBbox.
   *
   * @param {Bbox} geoBbox
   * @returns {Iterable<string>}
   */
  getMapsByGeoBbox(geoBbox: Bbox): Iterable<string> {
    // TODO: to make sure only tiles for visible parts of the map are requested
    // (and not for parts hidden behind maps on top of it)
    // Subtract geoMasks of maps that have been added before the current map:
    // Map A (topmost): show completely
    // Map B: B - A
    // Map C: C - B - A
    // Map D: D - C - B - A
    //
    // Possible libraries:
    //  - https://github.com/w8r/martinez
    //  - https://github.com/mfogel/polygon-clipping
    //
    // Do this only if transparancy of upper map is 0

    if (this.rtree) {
      return this.rtree.searchFromBbox(geoBbox)
    } else {
      return Array.from(this.warpedMapsById.keys())
    }
  }

  /**
   * Sets the object that caches image information
   *
   * @param {ImageInformations} imageInformations - object that caches image information
   */
  setImageInformations(imageInformations: ImageInformations): void {
    this.imageInformations = imageInformations
  }

  /**
   * Sets the resource mask for a specified map
   *
   * @param {string} mapId - ID of the map
   * @param {Ring} resourceMask - the new resource mask
   */
  setMapResourceMask(mapId: string, resourceMask: Ring): void {
    const warpedMap = this.warpedMapsById.get(mapId)
    if (warpedMap) {
      warpedMap.setResourceMask(resourceMask)
      this.addToOrUpdateRtree(warpedMap)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.RESOURCEMASKUPDATED, mapId)
      )
    }
  }

  /**
   * Sets the transformation type of specified maps
   *
   * @param {Iterable<string>} mapIds - the IDs of the maps
   * @param {TransformationType} transformationType - the new transformation type
   */
  setMapsTransformationType(
    mapIds: Iterable<string>,
    transformationType: TransformationType
  ): void {
    const mapIdsChanged = []
    for (const mapId of mapIds) {
      const warpedMap = this.warpedMapsById.get(mapId)
      if (warpedMap && warpedMap.transformationType != transformationType) {
        mapIdsChanged.push(mapId)
      }
    }
    if (mapIdsChanged.length > 0) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.PRECHANGE, mapIdsChanged)
      )
      mapIdsChanged.forEach((mapId) => {
        const warpedMap = this.warpedMapsById.get(mapId)
        if (warpedMap) {
          warpedMap.setTransformationType(transformationType)
          this.addToOrUpdateRtree(warpedMap)
        }
      })
      this.dispatchEvent(
        new WarpedMapEvent(
          WarpedMapEventType.TRANSFORMATIONCHANGED,
          mapIdsChanged
        )
      )
    }
  }

  /**
   * Sets the distortion measure of specified maps
   *
   * @param {Iterable<string>} mapIds - the IDs of the maps
   * @param {DistortionMeasure} [distortionMeasure] - the distortion measure
   */
  setMapsDistortionMeasure(
    mapIds: Iterable<string>,
    distortionMeasure?: DistortionMeasure
  ): void {
    const mapIdsChanged = []
    for (const mapId of mapIds) {
      const warpedMap = this.warpedMapsById.get(mapId)
      if (warpedMap && warpedMap.distortionMeasure != distortionMeasure) {
        mapIdsChanged.push(mapId)
      }
    }
    if (mapIdsChanged.length > 0) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.PRECHANGE, mapIdsChanged)
      )
      mapIdsChanged.forEach((mapId) => {
        const warpedMap = this.warpedMapsById.get(mapId)
        if (warpedMap) {
          warpedMap.setDistortionMeasure(distortionMeasure)
          this.addToOrUpdateRtree(warpedMap)
        }
      })
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.DISTORTIONCHANGED, mapIdsChanged)
      )
    }
  }

  /**
   * Changes the z-index of the specified maps to bring them to front
   *
   * @param {Iterable<string>} mapIds
   */
  bringMapsToFront(mapIds: Iterable<string>): void {
    let newZIndex = this.warpedMapsById.size
    for (const mapId of mapIds) {
      if (this.zIndices.has(mapId)) {
        this.zIndices.set(mapId, newZIndex)
        newZIndex++
      }
    }
    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))
  }

  /**
   * Changes the z-index of the specified maps to send them to back
   *
   * @param {Iterable<string>} mapIds
   */
  sendMapsToBack(mapIds: Iterable<string>): void {
    let newZIndex = -Array.from(mapIds).length
    for (const mapId of mapIds) {
      if (this.zIndices.has(mapId)) {
        this.zIndices.set(mapId, newZIndex)
        newZIndex++
      }
    }
    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))
  }

  /**
   * Changes the z-index of the specified maps to bring them forward
   *
   * @param {Iterable<string>} mapIds
   */
  bringMapsForward(mapIds: Iterable<string>): void {
    for (const [mapId, zIndex] of this.zIndices.entries()) {
      this.zIndices.set(mapId, zIndex * 2)
    }
    for (const mapId of mapIds) {
      const zIndex = this.zIndices.get(mapId)
      if (zIndex !== undefined) {
        this.zIndices.set(mapId, zIndex + 3)
      }
    }
    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))
  }

  /**
   * Changes the zIndex of the specified maps to send them backward
   *
   * @param {Iterable<string>} mapIds
   */
  sendMapsBackward(mapIds: Iterable<string>): void {
    for (const [mapId, zIndex] of this.zIndices.entries()) {
      this.zIndices.set(mapId, zIndex * 2)
    }
    for (const mapId of mapIds) {
      const zIndex = this.zIndices.get(mapId)
      if (zIndex !== undefined) {
        this.zIndices.set(mapId, zIndex - 3)
      }
    }
    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))
  }

  /**
   * Changes the visibility of the specified maps to `true`
   *
   * @param {Iterable<string>} mapIds
   */
  showMaps(mapIds: Iterable<string>): void {
    for (const mapId of mapIds) {
      const warpedMap = this.warpedMapsById.get(mapId)
      if (warpedMap) {
        warpedMap.visible = true
      }
    }
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.VISIBILITYCHANGED, mapIds)
    )
  }

  /**
   * Changes the visibility of the specified maps to `false`
   *
   * @param {Iterable<string>} mapIds
   */
  hideMaps(mapIds: Iterable<string>): void {
    for (const mapId of mapIds) {
      const warpedMap = this.warpedMapsById.get(mapId)
      if (warpedMap) {
        warpedMap.visible = false
      }
    }
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.VISIBILITYCHANGED, mapIds)
    )
  }

  /**
   * Adds a georeferenced map to this list
   *
   * @async
   * @param {unknown} georeferencedMap
   * @returns {Promise<string | Error>}
   */
  async addGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    const validatedGeoreferencedMapOrMaps = validateMap(georeferencedMap)
    const validatedGeoreferencedMap = Array.isArray(
      validatedGeoreferencedMapOrMaps
    )
      ? validatedGeoreferencedMapOrMaps[0]
      : validatedGeoreferencedMapOrMaps
    return this.addGeoreferencedMapInternal(validatedGeoreferencedMap)
  }

  /**
   * Removes a georeferenced map from this list
   *
   * @async
   * @param {unknown} georeferencedMap
   * @returns {Promise<string | Error>}
   */
  async removeGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    const validatedGeoreferencedMapOrMaps = validateMap(georeferencedMap)
    const validatedGeoreferencedMap = Array.isArray(
      validatedGeoreferencedMapOrMaps
    )
      ? validatedGeoreferencedMapOrMaps[0]
      : validatedGeoreferencedMapOrMaps
    return this.removeGeoreferencedMapInternal(validatedGeoreferencedMap)
  }

  /**
   * Parses an annotation and adds its georeferenced map to this list
   *
   * @async
   * @param {unknown} annotation
   * @returns {Promise<(string | Error)[]>}
   */
  async addGeoreferenceAnnotation(annotation: unknown) {
    const results: (string | Error)[] = []
    const maps = parseAnnotation(annotation)
    const settledResults = await Promise.allSettled(
      maps.map((map) => this.addGeoreferencedMapInternal(map))
    )
    // TODO: make sure reason contains Error
    for (const settledResult of settledResults) {
      if (settledResult.status === 'fulfilled') {
        results.push(settledResult.value)
      } else {
        results.push(settledResult.reason)
      }
    }
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.GEOREFERENCEANNOTATIONADDED)
    )
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))
    return results
  }

  /**
   * Parses an annotation and removes its georeferenced map from this list
   *
   * @async
   * @param {unknown} annotation
   * @returns {Promise<(string | Error)[]>}
   */
  async removeGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results: (string | Error)[] = []
    const maps = parseAnnotation(annotation)
    for (const map of maps) {
      const mapIdOrError = await this.removeGeoreferencedMapInternal(map)
      results.push(mapIdOrError)
    }
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.GEOREFERENCEANNOTATIONREMOVED)
    )
    return results
  }

  clear(): void {
    this.warpedMapsById = new Map()
    this.zIndices = new Map()
    this.rtree?.clear()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CLEARED))
  }

  destroy() {
    for (const warpedMap of this.getWarpedMaps()) {
      this.removeEventListenersFromWarpedMap(warpedMap)
      warpedMap.destroy()
    }

    this.clear()
  }

  private async addGeoreferencedMapInternal(
    georeferencedMap: GeoreferencedMap
  ): Promise<string> {
    const mapId = await this.getOrComputeMapId(georeferencedMap)

    const warpedMap = this.warpedMapFactory(mapId, georeferencedMap, {
      imageInformations: this.imageInformations,
      fetchFn: this.fetchFn,
      transformation: this.transformation
    })
    this.warpedMapsById.set(mapId, warpedMap)
    this.zIndices.set(mapId, this.warpedMapsById.size - 1)
    this.addToOrUpdateRtree(warpedMap)
    this.addEventListenersToWarpedMap(warpedMap)
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.WARPEDMAPADDED, mapId)
    )
    return mapId
  }

  private async removeGeoreferencedMapInternal(
    georeferencedMap: GeoreferencedMap
  ): Promise<string> {
    const mapId = await this.getOrComputeMapId(georeferencedMap)
    const warpedMap = this.warpedMapsById.get(mapId)
    if (warpedMap) {
      this.warpedMapsById.delete(mapId)
      this.zIndices.delete(mapId)
      this.removeFromRtree(warpedMap)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPREMOVED, mapId)
      )
      this.removeZIndexHoles()
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))

      warpedMap.destroy()
    } else {
      throw new Error(`No map found with ID ${mapId}`)
    }
    return mapId
  }

  private async getOrComputeMapId(
    georeferencedMap: GeoreferencedMap
  ): Promise<string> {
    const mapId =
      georeferencedMap.id || (await generateChecksum(georeferencedMap))
    return mapId
  }

  private addToOrUpdateRtree(warpedMap: W): void {
    if (this.rtree) {
      this.rtree.removeItem(warpedMap.mapId)
      this.rtree.addItem(warpedMap.mapId, warpedMap.geoMask)
    }
  }

  private removeFromRtree(warpedMap: W): void {
    if (this.rtree) {
      this.rtree.removeItem(warpedMap.mapId)
    }
  }

  private removeZIndexHoles(): void {
    const sortedZIndices = [...this.zIndices.entries()].sort(
      (entryA, entryB) => entryA[1] - entryB[1]
    )
    let zIndex = 0
    for (const entry of sortedZIndices) {
      const mapId = entry[0]
      this.zIndices.set(mapId, zIndex)
      zIndex++
    }
  }

  // This function and the listeners below transform an IMAGEINFOLOADED event by a WarpedMap
  // to an IMAGEINFOLOADED of the WarpedMapList, which is listened to in the Renderer
  private imageInfoLoaded() {
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
  }

  private addEventListenersToWarpedMap(warpedMap: W) {
    warpedMap.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this)
    )
  }

  private removeEventListenersFromWarpedMap(warpedMap: W) {
    warpedMap.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this)
    )
  }
}
