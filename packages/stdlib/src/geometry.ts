/* eslint-disable @typescript-eslint/no-explicit-any */
import { rewindGeometry } from '@placemarkio/geojson-rewind' // TODO: consider implementing these functions in this module instead of using dependencies

import type {
  Point,
  LineString,
  Line,
  Ring,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  Geometry,
  GeojsonPoint,
  GeojsonLineString,
  GeojsonPolygon,
  GeojsonMultiPoint,
  GeojsonMultiLineString,
  GeojsonMultiPolygon,
  GeojsonGeometry,
  Size,
  Triangle
} from '@allmaps/types'

// Assert

export function isPoint(input: any): input is Point {
  return (
    Array.isArray(input) &&
    input.length === 2 &&
    typeof input[0] === 'number' &&
    typeof input[1] === 'number'
  )
}

export function isLineString(input: any): input is LineString {
  return Array.isArray(input) && input.every(isPoint)
  // && !isClosed(input) // Possible addition if we want to check for closedness
}

// TODO: check if we keep Ring as unclosed.
// This function is not exported because Ring should not be used externally, since it can not be distingised from LineSting
function isRing(input: any): input is Ring {
  return (
    Array.isArray(input) && input.every(isPoint)
    // && isClosed(input) === closed // Possible addition if we want to check for closedness, with closed an input parameter with default false
  )
}

export function isPolygon(input: any): input is Polygon {
  return Array.isArray(input) && input.every(isRing)
}

export function isMultiPoint(input: any): input is MultiPoint {
  return Array.isArray(input) && input.every(isPoint)
}

export function isMultiLineString(input: any): input is MultiLineString {
  return Array.isArray(input) && input.every(isLineString)
}

export function isMultiPolygon(input: any): input is MultiPolygon {
  return Array.isArray(input) && input.every(isPolygon)
}

export function isGeometry(input: any): input is Geometry {
  return (
    isPoint(input) ||
    isLineString(input) ||
    isPolygon(input) ||
    isMultiPoint(input) ||
    isMultiLineString(input) ||
    isMultiPolygon(input)
  )
}

// Conform

export function conformLineString(lineString: LineString): LineString {
  // Filter out repeated points
  lineString = lineString.filter(function (point, i, originalLineString) {
    return i === 0 || !isEqualPoint(point, originalLineString[i - 1])
  })

  if (lineString.length < 2) {
    throw new Error('LineString should contain at least 2 points')
  }
  return lineString
}

export function conformRing(ring: Ring): Ring {
  // Filter out repeated points
  ring = ring.filter(function (point, i, originalRing) {
    return i === 0 || !isEqualPoint(point, originalRing[i - 1])
  })

  // Remove last point if input is closed ring
  if (isClosed(ring)) {
    ring.splice(-1)
  }

  if (ring.length < 3) {
    throw new Error('Ring should contain at least 3 points')
  }
  return ring
}

export function conformPolygon(polygon: Polygon): Polygon {
  return polygon.map((ring) => {
    return conformRing(ring)
  })
}

export function conformMultiLineString(
  multiLineString: MultiLineString
): MultiLineString {
  return multiLineString.map((lineString) => conformLineString(lineString))
}

export function conformMultiPolygon(multiPolygon: MultiPolygon): MultiPolygon {
  return multiPolygon.map((polygon) => conformPolygon(polygon))
}

// Convert to GeoJSON

export function pointToGeojsonPoint(point: Point): GeojsonPoint {
  return {
    type: 'Point',
    coordinates: point
  }
}

export function lineStringToGeojsonLineString(
  lineString: LineString
): GeojsonLineString {
  return {
    type: 'LineString',
    coordinates: lineString
  }
}

export function ringToGeojsonPolygon(ring: Ring, close = true): GeojsonPolygon {
  const geometry = {
    type: 'Polygon',
    coordinates: close ? [[...ring, ring[0]]] : [ring]
  }
  return rewindGeometry(geometry as GeojsonPolygon) as GeojsonPolygon
}

export function polygonToGeojsonPolygon(
  polygon: Polygon,
  close = true
): GeojsonPolygon {
  const geometry = {
    type: 'Polygon',
    coordinates: close
      ? polygon.map((ring) => {
          return [...ring, ring[0]]
        })
      : polygon
  }

  return rewindGeometry(geometry as GeojsonPolygon) as GeojsonPolygon
}

export function multiPointToGeojsonMultiPoint(
  multiPoint: MultiPoint
): GeojsonMultiPoint {
  return {
    type: 'MultiPoint',
    coordinates: multiPoint
  }
}

export function multiLineStringToGeojsonMultiLineString(
  multiLineString: MultiLineString
): GeojsonMultiLineString {
  return {
    type: 'MultiLineString',
    coordinates: multiLineString
  }
}

export function multiPolygonToGeojsonMultiPolygon(
  multiPolygon: MultiPolygon,
  close = true
): GeojsonMultiPolygon {
  const geometry = {
    type: 'MultiPolygon',
    coordinates: close
      ? multiPolygon.map((polygon) =>
          polygon.map((ring) => {
            return [...ring, ring[0]]
          })
        )
      : multiPolygon
  }

  return rewindGeometry(geometry as GeojsonMultiPolygon) as GeojsonMultiPolygon
}

export function geometryToGeojsonGeometry(geometry: Geometry): GeojsonGeometry {
  if (isPoint(geometry)) {
    return pointToGeojsonPoint(geometry)
  } else if (isLineString(geometry)) {
    return lineStringToGeojsonLineString(geometry)
  } else if (isPolygon(geometry)) {
    return polygonToGeojsonPolygon(geometry)
  } else if (isMultiPoint(geometry)) {
    return multiPointToGeojsonMultiPoint(geometry)
  } else if (isMultiLineString(geometry)) {
    return multiLineStringToGeojsonMultiLineString(geometry)
  } else if (isMultiPolygon(geometry)) {
    return multiPolygonToGeojsonMultiPolygon(geometry)
  } else {
    throw new Error('Geometry type not supported')
  }
}

// Check

export function isClosed(input: Point[]): boolean {
  return (
    Array.isArray(input) &&
    input.length >= 2 &&
    isEqualPoint(input[0], input[input.length - 1])
  )
}

export function isEqualPoint(point0: Point, point1: Point): boolean {
  if (point0 === point1) return true
  if (point0 === null || point1 === null) return false

  return point0[0] === point1[0] && point0[1] === point1[1]
}

export function isEqualPointArray(
  pointArray0: Point[],
  pointArray1: Point[]
): boolean {
  if (pointArray0 === pointArray1) return true
  if (!pointArray0 || !pointArray1) return false
  if (pointArray0.length !== pointArray1.length) return false

  for (let i = 0; i < pointArray0.length; ++i) {
    if (isEqualPoint(pointArray0[i], pointArray1[i])) return false
  }
  return true
}

export function isEqualPointArrayArray(
  pointArrayArray0: Point[][],
  pointArrayArray1: Point[][]
): boolean {
  if (pointArrayArray0 === pointArrayArray1) return true
  if (!pointArrayArray0 || !pointArrayArray1) return false
  if (pointArrayArray0.length !== pointArrayArray1.length) return false

  for (let i = 0; i < pointArrayArray0.length; ++i) {
    if (isEqualPointArray(pointArrayArray0[i], pointArrayArray1[i]))
      return false
  }
  return true
}

// Split, combine, shift, flip

export function pointsAndPointsToLines(
  points0: Point[],
  points1: Point[]
): Line[] {
  if (points0.length != points1.length)
    throw new Error('Point arrays should be of same lenght')

  return points0.map((point0, index) => [point0, points1[index]])
}

export function lineStringToLines(lineString: LineString): Line[] {
  return lineString.reduce(
    (accumulator: Line[], point, index) => [
      ...accumulator,
      [point, lineString[(index + 1) % lineString.length]]
    ],
    []
  )
}

export function pointToPixel(point: Point, translate: Point = [0, 0]): Point {
  return point.map((coordinate, index) => {
    return Math.floor(coordinate + translate[index])
  }) as Point
}

export function pixelToIntArrayIndex(
  pixel: Point,
  size: Size,
  channels: number,
  flipY = false
): number {
  const column = pixel[0]
  const row = flipY ? size[1] - 1 - pixel[1] : pixel[1]
  return (row * size[0] + column) * channels
}

export function flipX(point: Point): Point {
  return [-point[0], point[1]]
}

export function flipY(point: Point): Point {
  return [point[0], -point[1]]
}

// Mix

export function mixNumbers(
  number0: number,
  number1: number,
  t: number
): number {
  return number0 * (1 - t) + number1 * t
}

export function mixPoints(point0: Point, point1: Point, t: number): Point {
  return [
    mixNumbers(point0[0], point1[0], t),
    mixNumbers(point0[1], point1[1], t)
  ]
}

// Compute

export function midPoint(...points: Point[]): Point {
  const result: Point = [0, 0]
  for (let i = 0; i < points.length; i++) {
    result[0] += points[i][0]
    result[1] += points[i][1]
  }
  result[0] = result[0] / points.length
  result[1] = result[1] / points.length
  return result
}

// Return angle of line (in radians, signed)
export function lineAngle(line: Line): number {
  return Math.atan2(line[1][1] - line[0][1], line[1][0] - line[0][0])
}

// Return the next point starting from a point going a certian distance in a certain direction
export function stepDistanceAngle(
  point: Point,
  dist: number,
  angle: number
): Point {
  return [point[0] + Math.cos(angle) * dist, point[1] + Math.sin(angle) * dist]
}

export function distance(from: Line): number
export function distance(from: Point): number
export function distance(from: Point, to: Point): number
export function distance(from: Point | Line, to?: Point): number {
  if (isLineString(from) && from.length === 2) {
    return distance(from[0], from[1])
  } else if (isPoint(from) && to === undefined) {
    return distance(from, [0, 0])
  } else if (isPoint(from) && isPoint(to)) {
    return Math.sqrt(squaredDistance(from, to))
  } else {
    throw new Error('Input type not supported')
  }
}

// Squared distance is faster to compute then distance
// (which requires espensive square root)
// and can be used for things like sorting distance etc.
export function squaredDistance(from: Line): number
export function squaredDistance(from: Point): number
export function squaredDistance(from: Point, to: Point): number
export function squaredDistance(from: Point | Line, to?: Point): number {
  if (isLineString(from) && from.length === 2) {
    return squaredDistance(from[0], from[1])
  } else if (isPoint(from) && to === undefined) {
    return squaredDistance(from, [0, 0])
  } else if (isPoint(from) && isPoint(to)) {
    return (to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2
  } else {
    throw new Error('Input type not supported')
  }
}

export function triangleArea(triangle: Triangle): number {
  return (
    0.5 *
    Math.abs(
      triangle[0][0] * (triangle[1][1] - triangle[2][1]) +
        triangle[1][0] * (triangle[2][1] - triangle[0][1]) +
        triangle[2][0] * (triangle[0][1] - triangle[1][1])
    )
  )
}

export function invertPoint(point: Point): Point {
  return [-point[0], -point[1]]
}

export function scalePoint(point: Point, scale: number): Point {
  if (scale == 1) {
    return point
  }

  return [point[0] * scale, point[1] * scale]
}

export function scalePoints(points: Point[], scale: number): Point[] {
  if (scale == 1) {
    return points
  }
  return points.map((point) => scalePoint(point, scale))
}

export function translatePoint(
  point: Point,
  translationPoint: Point,
  addOrSubstract: 'add' | 'substract' = 'add'
): Point {
  if (addOrSubstract == 'add') {
    return [point[0] + translationPoint[0], point[1] + translationPoint[1]]
  } else {
    return [point[0] - translationPoint[0], point[1] - translationPoint[1]]
  }
}

export function translatePoints(
  points: Point[],
  point: Point,
  addOrSubstract: 'add' | 'substract' = 'add'
): Point[] {
  if (isEqualPoint(point, [0, 0])) {
    return points
  }

  return points.map((p) => translatePoint(p, point, addOrSubstract))
}

export function rotatePoint(
  point: Point,
  angle: number = 0,
  anchor: Point | undefined = undefined,
  cosAngle?: number,
  sinAngle?: number
): Point {
  if (angle == 0) {
    return point
  }

  if (anchor) {
    return translatePoint(
      rotatePoint(
        translatePoint(point, anchor, 'substract'),
        angle,
        undefined,
        cosAngle,
        sinAngle
      ),
      anchor
    )
  } else {
    cosAngle = cosAngle || Math.cos(angle)
    sinAngle = sinAngle || Math.sin(angle)

    return [
      point[0] * cosAngle - point[1] * sinAngle,
      point[0] * sinAngle + point[1] * cosAngle
    ]
  }
}

export function rotatePoints(
  points: Point[],
  angle: number = 0,
  anchor: Point | undefined = undefined,
  cosAngle?: number,
  sinAngle?: number
): Point[] {
  if (angle == 0) {
    return points
  }

  cosAngle = cosAngle || Math.cos(angle)
  sinAngle = sinAngle || Math.sin(angle)

  return points.map((point) =>
    rotatePoint(point, angle, anchor, cosAngle, sinAngle)
  )
}
