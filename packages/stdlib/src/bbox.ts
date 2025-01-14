import monotoneChainConvexHull from 'monotone-chain-convex-hull'

import { isGeojsonGeometry, geojsonGeometryToGeometry } from './geojson.js'
import { isPoint, isPolygon, distance } from './geometry.js'

import type {
  Point,
  LineString,
  Polygon,
  Geometry,
  Line,
  Rectangle,
  Bbox,
  Size,
  Fit,
  GeojsonGeometry,
  Ring
} from '@allmaps/types'

// Compute

export function computeMinMax(values: number[]): [number, number] {
  let min: number = Number.POSITIVE_INFINITY
  let max: number = Number.NEGATIVE_INFINITY

  for (const value of values) {
    if (min === undefined) {
      if (value >= value) min = max = value
    } else {
      if (min > value) min = value
      if (max < value) max = value
    }
  }

  return [min, max]
}

// Note: bbox order is minX, minY, maxX, maxY
export function computeBbox(points: Geometry | GeojsonGeometry): Bbox {
  if (isPoint(points)) {
    points = [points]
  }
  if (isPolygon(points)) {
    points = points.flat()
  }
  if (isGeojsonGeometry(points)) {
    return computeBbox(geojsonGeometryToGeometry(points))
  }

  // TODO: do this without making two new arrays
  const xs = []
  const ys = []

  for (const point of points as LineString) {
    xs.push(point[0])
    ys.push(point[1])
  }

  const [minX, maxX] = computeMinMax(xs)
  const [minY, maxY] = computeMinMax(ys)

  return [minX, minY, maxX, maxY]
}

export function combineBboxes(...bboxes: Bbox[]): Bbox | undefined {
  if (bboxes.length == 0) {
    return undefined
  }

  return [
    Math.min(...bboxes.map((bbox) => bbox[0])),
    Math.min(...bboxes.map((bbox) => bbox[1])),
    Math.max(...bboxes.map((bbox) => bbox[2])),
    Math.max(...bboxes.map((bbox) => bbox[3]))
  ]
}

export function doBboxesIntersect(bbox0: Bbox, bbox1: Bbox): boolean {
  const isOverlappingInX = bbox0[2] >= bbox1[0] && bbox1[2] >= bbox0[0]
  const isOverlappingInY = bbox0[3] >= bbox1[1] && bbox1[3] >= bbox0[1]

  return isOverlappingInX && isOverlappingInY
}

export function bboxesIntersect(bbox0: Bbox, bbox1: Bbox): Bbox | undefined {
  const minX = Math.max(bbox0[0], bbox1[0])
  const maxX = Math.min(bbox0[2], bbox1[2])
  const minY = Math.max(bbox0[1], bbox1[1])
  const maxY = Math.min(bbox0[3], bbox1[3])

  if (minX < maxX && minY < maxY) {
    return [minX, minY, maxX, maxY]
  } else {
    return undefined
  }
}

export function pointInBbox(point: Point, bbox: Bbox): boolean {
  return doBboxesIntersect([point[0], point[1], point[0], point[1]], bbox)
}

export function bufferBbox(bbox: Bbox, dist0: number, dist1: number): Bbox {
  if (dist1 === undefined) {
    dist1 = dist0
  }
  return [bbox[0] - dist0, bbox[1] - dist1, bbox[2] + dist0, bbox[3] + dist1]
}

// Ratio 2 adds half the current width (or height) both left and right of the current (width or height)
// so the total width (or height) goes * 2 and the total surface goes * 4
export function bufferBboxByRatio(bbox: Bbox, ratio: number): Bbox {
  if (ratio == 0) {
    return bbox
  }
  const size = bboxToSize(bbox)
  return bufferBbox(
    bbox,
    ...(size.map((widthOrHeigth) => (widthOrHeigth * ratio) / 2) as [
      number,
      number
    ])
  )
}

// Transform

// Returns a rectangle with four points, starting from lower left and going anti-clockwise.
export function bboxToRectangle(bbox: Bbox): Rectangle {
  return [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[1]],
    [bbox[2], bbox[3]],
    [bbox[0], bbox[3]]
  ]
}

export function bboxToPolygon(bbox: Bbox): Polygon {
  return [bboxToRectangle(bbox)]
}

export function bboxToLine(bbox: Bbox): Line {
  return [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[3]]
  ]
}

export function bboxToPoint(bbox: Bbox): Point {
  return [bbox[0], bbox[1]]
}

export function bboxToDiameter(bbox: Bbox): number {
  return distance(bboxToLine(bbox))
}

export function geometryToDiameter(
  geometry: Geometry | GeojsonGeometry
): number {
  return distance(bboxToLine(computeBbox(geometry)))
}

export function bboxToCenter(bbox: Bbox): Point {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
}

export function bboxToSize(bbox: Bbox): Size {
  return [bbox[2] - bbox[0], bbox[3] - bbox[1]]
}

// Approximate results for quadrilaterals, exact for rectangles (e.g. coming from bboxes).
// A more precise result would require a minimal-covering-rectangle algorithm
// Or computing and comparing rectangle surfaces
export function rectangleToSize(rectangle: Rectangle): Size {
  return [
    0.5 *
      (distance(rectangle[0], rectangle[1]) +
        distance(rectangle[2], rectangle[3])),
    0.5 *
      (distance(rectangle[1], rectangle[2]) +
        distance(rectangle[3], rectangle[0]))
  ]
}

// Convex hull

export function convexHull(points: Point[]): Ring | undefined {
  if (points.length == 0) {
    return undefined
  }

  return monotoneChainConvexHull(points)
}

// Sizes and Scales

/**
 * Compute a size from two scales
 *
 * For unspecified 'fit', the scale is computed based on the surface area derived from the sizes.
 *
 * For specified 'fit':
 *
 * Example for square rectangles '*' and '+':
 *
 * 'contain' where '*' contains '.'
 * (in the first image size0 is relatively wider)
 *
 *                ****
 *                *  *
 *   **....**     ....
 *   * .  . *     .  .
 *   **....**     ....
 *                *  *
 *                ****
 *
 *
 * 'cover' where '*' is covered by '.'
 * (in the first image size0 is relatively wider)
 *
 *                ....
 *                .  .
 *   ..****..     ****
 *   . *  * .     *  *
 *   ..****..     ****
 *                .  .
 *                ....
 *
 * @export
 * @param {Size} size0 - first size
 * @param {Size} size1 - second size
 * @param {?Fit} [fit] - fit
 * @returns {number}
 */
export function sizesToScale(size0: Size, size1: Size, fit?: Fit): number {
  if (!fit) {
    return Math.sqrt((size0[0] * size0[1]) / (size1[0] * size1[1]))
  } else if (fit === 'contain') {
    return size0[0] / size0[1] >= size1[0] / size1[1] // size0 is relatively wider
      ? size0[0] / size1[0]
      : size0[1] / size1[1]
  } else {
    // fit = 'cover'
    return size0[0] / size0[1] >= size1[0] / size1[1] // size0 is relatively wider
      ? size0[1] / size1[1]
      : size0[0] / size1[0]
  }
}

export function scaleSize(size: Size, scale: number): Size {
  return [size[0] * scale, size[1] * scale]
}

export function sizeToResolution(size: Size): number {
  return size[0] * size[1]
}

export function sizeToCenter(size: Size): Point {
  return [size[0] / 2, size[1] / 2]
}

export function sizeToBbox(size: Size): Bbox {
  return [0, 0, ...size]
}

export function sizeToRectangle(size: Size): Rectangle {
  return bboxToRectangle(sizeToBbox(size))
}

export function bboxesToScale(bbox0: Bbox, bbox1: Bbox): number {
  return sizesToScale(bboxToSize(bbox0), bboxToSize(bbox1))
}

export function rectanglesToScale(
  rectangle0: Rectangle,
  rectangle1: Rectangle
): number {
  return sizesToScale(rectangleToSize(rectangle0), rectangleToSize(rectangle1))
}
