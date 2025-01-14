import WarpedMapList from '../maps/WarpedMapList.js'
import {
  composeTransform,
  applyTransform,
  invertTransform
} from '../shared/matrix.js'

import {
  computeBbox,
  bboxToCenter,
  bboxToRectangle,
  bboxToSize,
  sizesToScale,
  bufferBboxByRatio,
  webMercatorToLonLat,
  scaleSize,
  rotatePoints,
  translatePoints,
  sizeToResolution,
  sizeToBbox,
  sizeToCenter,
  scalePoint,
  sizeToRectangle,
  midPoint,
  scalePoints,
  rotatePoint
} from '@allmaps/stdlib'

import type WarpedMap from '../maps/WarpedMap.js'

import type {
  Point,
  Rectangle,
  Size,
  Bbox,
  Transform,
  Fit,
  Polygon
} from '@allmaps/types'

/**
 * The viewport describes the view on the rendered map.
 * @export
 * @class Viewport
 * @typedef {Viewport}
 * @extends {EventTarget}
 * @property {Point} geoCenter - Center point of the viewport, in longitude/latitude coordinates.
 * @property {Rectangle} geoRectangle - Rotated rectangle (possibly quadrilateral) of the viewport point, in longitude/latitude coordinates.
 * @property {Size} geoSize - Size of the viewport in longitude/latitude coordinates, as [width, height]. (This is the size of the bounding box of the rectangle, since longitude/latitude only makes sense in that case).
 * @property {number} geoResolution - Resolution of the viewport in longitude/latitude coordinates, as width * height. (This is the size of the bounding box of the rectangle, since longitude/latitude only makes sense in that case).
 * @property {Bbox} geoRectangleBbox - Bounding box of the rotated rectangle of the viewport, in longitude/latitude coordinates.
 * @property {Point} projectedGeoCenter - Center point of the viewport, in projected geo coordinates.
 * @property {Rectangle} projectedGeoRectangle - Rotated rectangle of the viewport point, in projected geo coordinates.
 * @property {Size} projectedGeoSize - Size of the viewport in projected geo coordinates, as [width, height]. (This is not the size of the bounding box of the rotated rectangle, but the width and hight of the rectangle).
 * @property {number} projectedGeoResolution - Resolution of the viewport in projected geo coordinates, as width * height. (This is not the size of the bounding box of the rotated rectangle, but the width and hight of the rectangle).
 * @property {Bbox} projectedGeoRectangleBbox - Bounding box of the rotated rectangle of the viewport, in projected geo coordinates.
 * @property {number} rotation - Rotation of the viewport with respect to the projected coordinate system.
 * @property {number} projectedGeoPerViewportScale - Scale of the viewport, in projected geo coordinates per viewport pixel.
 * @property {Point} viewportCenter - Center point of the viewport, in viewport pixels.
 * @property {Rectangle} viewportRectangle - Rectangle of the viewport point, in viewport pixels.
 * @property {Size} viewportSize - Size of the viewport in viewport pixels, as [width, height].
 * @property {number} viewportResolution - Resolution of the viewport in viewport pixels, as width * height.
 * @property {Bbox} viewportBbox - Bounding box of the viewport, in viewport pixels.
 * @property {number} devicePixelRatio - The devicePixelRatio of the viewport.
 * @property {Point} canvasCenter - Center point of the canvas, in canvas pixels.
 * @property {Rectangle} canvasRectangle - Rectangle of the canvas, in canvas pixels.
 * @property {Size} canvasSize - Size of the canvas in canvas pixels (viewportSize*devicePixelRatio), as [width, height].
 * @property {number} canvasResolution - Resolution of the canvas in canvas pixels (viewportSize*devicePixelRatio), as width * height.
 * @property {Bbox} canvasBbox - Bounding box of the canvas, in canvas pixels.
 * @property {number} projectedGeoPerCanvasScale - Scale of the viewport, in projected geo coordinates per canvas pixel (projectedGeoPerViewportScale/devicePixelRatio).
 * @property {Transform} projectedGeoToViewportTransform - Transform from projected geo coordinates to viewport pixels. Equivalent to OpenLayers coordinateToPixelTransform.
 * @property {Transform} projectedGeoToCanvasTransform - Transform from projected geo coordinates to canvas pixels.
 * @property {Transform} projectedGeoToClipTransform - Transform from projected geo coordinates to WebGL coordinates in the [-1, 1] range. Equivalent to OpenLayers projectionTransform.
 * @property {Transform} viewportToClipTransform - Transform from viewport coordinates to WebGL coordinates in the [-1, 1] range.
 */
export default class Viewport {
  geoCenter: Point
  geoRectangle: Rectangle
  geoSize: Size
  geoResolution: number
  geoRectangleBbox: Bbox
  projectedGeoCenter: Point
  projectedGeoRectangle: Rectangle
  projectedGeoSize: Size
  projectedGeoResolution: number
  projectedGeoRectangleBbox: Bbox
  rotation: number
  projectedGeoPerViewportScale: number

  viewportCenter: Point
  viewportRectangle: Rectangle
  viewportSize: Size
  viewportResolution: number
  viewportBbox: Bbox

  devicePixelRatio: number
  canvasCenter: Point
  canvasRectangle: Rectangle
  canvasSize: Size
  canvasResolution: number
  canvasBbox: Bbox

  projectedGeoPerCanvasScale: number
  projectedGeoToViewportTransform: Transform = [1, 0, 0, 1, 0, 0]
  projectedGeoToCanvasTransform: Transform = [1, 0, 0, 1, 0, 0]
  projectedGeoToClipTransform: Transform = [1, 0, 0, 1, 0, 0]
  viewportToClipTransform: Transform = [1, 0, 0, 1, 0, 0]

  /**
   * Creates a new Viewport
   *
   * @constructor
   * @param {Size} viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param {Point} projectedGeoCenter - Center point of the viewport, in projected coordinates.
   * @param {number} projectedGeoPerViewportScale - Scale of the viewport, in projection coordinates per viewport pixel.
   * @param {number} [rotation=0] - Rotation of the viewport with respect to the projected geo coordinate system. Positive values rotate the viewport positively (i.e. counter-clockwise) w.r.t. the map in projected geo coordinates. This is equivalent to rotating the map negatively (i.e. clockwise) within the viewport.
   * @param {number} [devicePixelRatio=1] - The devicePixelRatio of the viewport.
   */
  constructor(
    viewportSize: Size,
    projectedGeoCenter: Point,
    projectedGeoPerViewportScale: number,
    rotation = 0,
    devicePixelRatio = 1
  ) {
    this.projectedGeoCenter = projectedGeoCenter
    this.projectedGeoPerViewportScale = projectedGeoPerViewportScale
    this.rotation = rotation
    this.viewportSize = [
      Math.round(viewportSize[0]),
      Math.round(viewportSize[1])
    ] // Note: assure integer values for viewport size, so they can be stored in arrays
    this.devicePixelRatio = devicePixelRatio

    this.projectedGeoRectangle = this.computeProjectedGeoRectangle(
      this.viewportSize,
      this.projectedGeoPerViewportScale,
      this.rotation,
      this.projectedGeoCenter
    )
    this.projectedGeoRectangleBbox = computeBbox(this.projectedGeoRectangle)
    this.projectedGeoSize = scaleSize(
      this.viewportSize,
      projectedGeoPerViewportScale
    )
    this.projectedGeoResolution = sizeToResolution(this.projectedGeoSize)

    this.geoCenter = webMercatorToLonLat(this.projectedGeoCenter)
    // TODO: improve this with an interpolated back-projection, resulting in a ring
    this.geoRectangle = this.projectedGeoRectangle.map((point) => {
      return webMercatorToLonLat(point)
    }) as Rectangle
    this.geoRectangleBbox = computeBbox(this.geoRectangle)
    this.geoSize = bboxToSize(this.geoRectangleBbox)
    this.geoResolution = sizeToResolution(this.geoSize)

    this.viewportResolution = sizeToResolution(this.viewportSize)
    this.viewportCenter = sizeToCenter(this.viewportSize)
    this.viewportBbox = sizeToBbox(this.viewportSize)
    this.viewportRectangle = bboxToRectangle(this.viewportBbox)

    this.canvasCenter = scalePoint(this.viewportCenter, this.devicePixelRatio)
    this.canvasSize = scaleSize(this.viewportSize, this.devicePixelRatio)
    this.canvasResolution = sizeToResolution(this.canvasSize)
    this.canvasBbox = sizeToBbox(this.canvasSize)
    this.canvasRectangle = bboxToRectangle(this.canvasBbox)

    this.projectedGeoPerCanvasScale =
      this.projectedGeoPerViewportScale / this.devicePixelRatio

    this.projectedGeoToViewportTransform =
      this.composeProjectedGeoToViewportTransform()
    this.projectedGeoToCanvasTransform =
      this.composeProjectedGeoToCanvasTransform()
    this.projectedGeoToClipTransform = this.composeProjectedGeoToClipTransform()
    this.viewportToClipTransform = this.composeViewportToClipTransform()
  }

  /**
   * Static method that creates a Viewport from a viewport size and a WarpedMapList
   *
   * @static
   * @template {WarpedMap} W
   * @param {Size} viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param {WarpedMapList<W>} warpedMapList - A WarpedMapList.
   * @param {string[]} [mapIds] - IDs of the maps to include. Set to 'undefined' to include all maps.
   * @param {Fit} [fit='contain'] - Whether the viewport should contain or cover the bbox of the warpedMapList.
   * @param {number} [rotation] - Rotation of the viewport with respect to the projected geo coordinate system. Positive values rotate the viewport positively (i.e. counter-clockwise) w.r.t. the map in projected geo coordinates. This is equivalent to rotating the map negatively (i.e. clockwise) within the viewport.
   * @param {number} [devicePixelRatio] - The devicePixelRatio of the viewport.
   * @param {number} [zoom] - The zoom on the viewport.
   * @returns {Viewport} - A new Viewport object.
   */
  static fromSizeAndMaps<W extends WarpedMap>(
    viewportSize: Size,
    warpedMapList: WarpedMapList<W>,
    mapIds?: string[],
    fit: Fit = 'contain',
    rotation?: number,
    devicePixelRatio?: number,
    zoom?: number
  ): Viewport {
    const projectedGeoConvexHull = warpedMapList.getProjectedConvexHull(mapIds)

    if (!projectedGeoConvexHull) {
      throw new Error(
        'WarpedMapList has no projected convex hull. Possibly because it is empty.'
      )
    }

    return this.fromSizeAndPolygon(
      viewportSize,
      [projectedGeoConvexHull],
      fit,
      rotation,
      devicePixelRatio,
      zoom
    )
  }

  /**
   * Static method that creates a Viewport from a viewport size and a polygon in projected geospatial coordinates.
   *
   * @static
   * @param {Size} viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param {Polygon} projectedGeoPolygon - A polygon in projected geo coordinates.
   * @param {Fit} [fit='contain'] - Whether the viewport should contain or cover the bbox of the warpedMapList.
   * @param {number} [rotation] - Rotation of the viewport with respect to the projected geo coordinate system. Positive values rotate the viewport positively (i.e. counter-clockwise) w.r.t. the map in projected geo coordinates. This is equivalent to rotating the map negatively (i.e. clockwise) within the viewport.
   * @param {number} [devicePixelRatio] - The devicePixelRatio of the viewport.
   * @param {number} [zoom=1] - The zoom on the viewport.
   * @returns {Viewport} - A new Viewport object.
   */
  static fromSizeAndPolygon(
    viewportSize: Size,
    projectedGeoPolygon: Polygon,
    fit: Fit = 'contain',
    rotation?: number,
    devicePixelRatio?: number,
    zoom = 1
  ): Viewport {
    const projectedGeoRing = projectedGeoPolygon[0]
    const rotatedProjectedGeoRing = rotatePoints(
      projectedGeoRing,
      rotation ? -rotation : undefined
    )
    const rotatedProjectedGeoBbox = computeBbox(rotatedProjectedGeoRing)
    const rotatedProjectedGeoSize = bboxToSize(rotatedProjectedGeoBbox)
    const rotatedProjectedGeoCenter = bboxToCenter(rotatedProjectedGeoBbox)
    const projectedGeoPerViewportScale = sizesToScale(
      rotatedProjectedGeoSize,
      viewportSize,
      fit
    )

    const projectedGeoCenter = rotatePoint(rotatedProjectedGeoCenter, rotation)

    return new Viewport(
      viewportSize,
      projectedGeoCenter,
      projectedGeoPerViewportScale * zoom,
      rotation,
      devicePixelRatio
    )
  }

  /**
   * Static method that creates a Viewport from a warped map list and a projected geo per viewport scale.
   *
   * @static
   * @template {WarpedMap} W
   * @param {number} projectedGeoPerViewportScale - Scale of the viewport, in projected coordinates per viewport pixel.
   * @param {WarpedMapList<W>} warpedMapList - A WarpedMapList.
   * @param {string[]} [mapIds] - IDs of the maps to include. Set to 'undefined' to include all maps.
   * @param {number} [rotation] - Rotation of the viewport with respect to the projected geo coordinate system. Positive values rotate the viewport positively (i.e. counter-clockwise) w.r.t. the map in projected geo coordinates. This is equivalent to rotating the map negatively (i.e. clockwise) within the viewport.
   * @param {number} [devicePixelRatio] - The devicePixelRatio of the viewport.
   * @param {number} [zoom] - The zoom on the viewport.
   * @returns {Viewport} - A new Viewport object.
   */
  static fromScaleAndMaps<W extends WarpedMap>(
    projectedGeoPerViewportScale: number,
    warpedMapList: WarpedMapList<W>,
    mapIds: string[],
    rotation?: number,
    devicePixelRatio?: number,
    zoom?: number
  ): Viewport {
    const projectedGeoConvexHull = warpedMapList.getProjectedConvexHull(mapIds)

    if (!projectedGeoConvexHull) {
      throw new Error(
        'WarpedMapList has no projected convex hull. Possibly because it is empty.'
      )
    }

    return this.fromScaleAndPolygon(
      [projectedGeoConvexHull],
      projectedGeoPerViewportScale,
      rotation,
      devicePixelRatio,
      zoom
    )
  }

  /**
   * Static method that creates a Viewport from a polygon in projected geospatial coordinates and a projected geo per viewport scale.
   *
   * @static
   * @param {Bbox} projectedGeoPolygon - A polygon in projected geospatial coordinates.
   * @param {number} projectedGeoPerViewportScale - Scale of the viewport, in projected geo coordinates per viewport pixel.
   * @param {number} [rotation] - Rotation of the viewport with respect to the projected geo coordinate system. Positive values rotate the viewport positively (i.e. counter-clockwise) w.r.t. the map in projected geo coordinates. This is equivalent to rotating the map negatively (i.e. clockwise) within the viewport.
   * @param {number} [devicePixelRatio] - The devicePixelRatio of the viewport.
   * @param {number} [zoom=1] - The zoom on the viewport.
   * @returns {Viewport} - A new Viewport object.
   */
  static fromScaleAndPolygon(
    projectedGeoPolygon: Polygon,
    projectedGeoPerViewportScale: number,
    rotation?: number,
    devicePixelRatio?: number,
    zoom = 1
  ): Viewport {
    const projectedGeoRing = projectedGeoPolygon[0]
    const viewportRing = scalePoints(
      rotatePoints(projectedGeoRing, rotation ? -rotation : undefined),
      1 / projectedGeoPerViewportScale
    )
    const viewportBbox = computeBbox(viewportRing)
    const viewportSize = bboxToSize(viewportBbox)
    const viewportCenter = bboxToCenter(viewportBbox)
    const projectedGeoCenter = rotatePoint(
      scalePoint(viewportCenter, projectedGeoPerViewportScale),
      rotation
    )

    return new Viewport(
      viewportSize,
      projectedGeoCenter,
      projectedGeoPerViewportScale * zoom,
      rotation,
      devicePixelRatio
    )
  }

  getProjectedGeoBufferedRectangle(bufferFraction: number): Rectangle {
    const viewportBufferedBbox = bufferBboxByRatio(
      this.viewportBbox,
      bufferFraction
    )
    const viewportBufferedRectangle = bboxToRectangle(viewportBufferedBbox)
    return viewportBufferedRectangle.map((point) =>
      applyTransform(
        invertTransform(this.projectedGeoToViewportTransform),
        point
      )
    ) as Rectangle
  }

  private composeProjectedGeoToViewportTransform(): Transform {
    return composeTransform(
      this.viewportCenter[0],
      this.viewportCenter[1],
      1 / this.projectedGeoPerViewportScale,
      -1 / this.projectedGeoPerViewportScale, // '-' for handedness
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }

  private composeProjectedGeoToCanvasTransform(): Transform {
    return composeTransform(
      this.canvasCenter[0],
      this.canvasCenter[1],
      1 / this.projectedGeoPerCanvasScale,
      -1 / this.projectedGeoPerCanvasScale, // '-' for handedness
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }

  private composeProjectedGeoToClipTransform(): Transform {
    return composeTransform(
      0,
      0,
      2 / (this.projectedGeoPerViewportScale * this.viewportSize[0]),
      2 / (this.projectedGeoPerViewportScale * this.viewportSize[1]),
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }

  private composeViewportToClipTransform(): Transform {
    return composeTransform(
      0,
      0,
      2 / this.viewportSize[0],
      -2 / this.viewportSize[1], // '-' for handedness
      0,
      -this.viewportCenter[0],
      -this.viewportCenter[1]
    )
  }

  /**
   * Returns a rectangle in projected geo coordinates
   *
   * The rectangle is the result of a horizontal rectangle in Viewport space of size 'viewportSize',
   * scaled using projectedGeoPerViewportScale, centered,
   * rotated using 'rotation' and translated to 'projectedGeoCenter'.
   *
   * @private
   * @param {Size} viewportSize
   * @param {number} projectedGeoPerViewportScale
   * @param {number} rotation
   * @param {Point} projectedGeoCenter
   * @returns {Rectangle}
   */
  private computeProjectedGeoRectangle(
    viewportSize: Size,
    projectedGeoPerViewportScale: number,
    rotation: number,
    projectedGeoCenter: Point
  ): Rectangle {
    const scaled = scaleSize(viewportSize, projectedGeoPerViewportScale)
    const rectangle = sizeToRectangle(scaled)
    const centered = translatePoints(
      rectangle,
      midPoint(...rectangle),
      'substract'
    ) as Rectangle
    const rotated = rotatePoints(centered, rotation) as Rectangle
    const translated = translatePoints(rotated, projectedGeoCenter) as Rectangle

    return translated
  }
}
