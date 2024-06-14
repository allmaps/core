// TODO: consider implementing these functions in stdlib instead of using dependencies
import getWorldMidpoint from '@turf/midpoint'
import getWorldDistance from '@turf/distance'

import GcpTransformer from '../transformer'
import {
  refineLineString,
  refineRectangleToRectangles,
  refineRing
} from './refinement-helper-functions.js'

import type { TransformOptions, RefinementOptions } from './types.js'

import type {
  Point,
  LineString,
  Ring,
  Polygon,
  Rectangle
} from '@allmaps/types'

export const defaultTransformOptions: TransformOptions = {
  maxOffsetRatio: 0,
  minOffsetDistance: Infinity,
  minLineDistance: Infinity,
  maxDepth: 0,
  destinationIsGeographic: false,
  sourceIsGeographic: false,
  inputIsMultiGeometry: false,
  differentHandedness: false,
  evaluationType: 'function',
  returnDomain: 'normal'
}

export function refinementOptionsFromForwardTransformOptions(
  transformOptions: TransformOptions
): Partial<RefinementOptions> {
  const refinementOptions: Partial<RefinementOptions> = {
    maxOffsetRatio: transformOptions.maxOffsetRatio,
    maxDepth: transformOptions.maxDepth
  }

  if (transformOptions.sourceIsGeographic) {
    refinementOptions.sourceMidPointFunction = (point0: Point, point1: Point) =>
      getWorldMidpoint(point0, point1).geometry.coordinates as Point
  }
  if (transformOptions.destinationIsGeographic) {
    refinementOptions.destinationMidPointFunction = (
      point0: Point,
      point1: Point
    ) => getWorldMidpoint(point0, point1).geometry.coordinates as Point
    refinementOptions.destinationDistanceFunction = getWorldDistance
  }
  if (transformOptions.returnDomain == 'inverse') {
    refinementOptions.returnDomain = 'source'
  }
  return refinementOptions
}

export function refinementOptionsFromBackwardTransformOptions(
  transformOptions: TransformOptions
): Partial<RefinementOptions> {
  const refinementOptions: Partial<RefinementOptions> = {
    maxOffsetRatio: transformOptions.maxOffsetRatio,
    maxDepth: transformOptions.maxDepth
  }

  if (transformOptions.destinationIsGeographic) {
    refinementOptions.sourceMidPointFunction = (point0: Point, point1: Point) =>
      getWorldMidpoint(point0, point1).geometry.coordinates as Point
  }
  if (transformOptions.sourceIsGeographic) {
    refinementOptions.destinationMidPointFunction = (
      point0: Point,
      point1: Point
    ) => getWorldMidpoint(point0, point1).geometry.coordinates as Point
    refinementOptions.destinationDistanceFunction = getWorldDistance
  }
  if (transformOptions.returnDomain == 'inverse') {
    refinementOptions.returnDomain = 'source'
  }
  return refinementOptions
}

export function transformLineStringForwardToLineString(
  lineString: LineString,
  transformer: GcpTransformer,
  transformOptions: TransformOptions
): LineString {
  return refineLineString(
    lineString,
    (p) => transformer.transformForward(p),
    refinementOptionsFromForwardTransformOptions(transformOptions)
  )
}

export function transformLineStringBackwardToLineString(
  lineString: LineString,
  transformer: GcpTransformer,
  transformOptions: TransformOptions
): LineString {
  return refineLineString(
    lineString,
    (p) => transformer.transformBackward(p),
    refinementOptionsFromBackwardTransformOptions(transformOptions)
  )
}

export function transformRingForwardToRing(
  ring: Ring,
  transformer: GcpTransformer,
  transformOptions: TransformOptions
): Ring {
  return refineRing(
    ring,
    (p) => transformer.transformForward(p),
    refinementOptionsFromForwardTransformOptions(transformOptions)
  )
}

export function transformRingBackwardToRing(
  ring: Ring,
  transformer: GcpTransformer,
  transformOptions: TransformOptions
): Ring {
  return refineRing(
    ring,
    (p) => transformer.transformBackward(p),
    refinementOptionsFromBackwardTransformOptions(transformOptions)
  )
}

export function transformPolygonForwardToPolygon(
  polygon: Polygon,
  transformer: GcpTransformer,
  transformOptions: TransformOptions
): Polygon {
  return polygon.map((ring) => {
    return transformRingForwardToRing(ring, transformer, transformOptions)
  })
}

export function transformPolygonBackwardToPolygon(
  polygon: Polygon,
  transformer: GcpTransformer,
  transformOptions: TransformOptions
): Polygon {
  return polygon.map((ring) => {
    return transformRingBackwardToRing(ring, transformer, transformOptions)
  })
}

// TODO: consoder to add these as methods on transformer class
export function transformRectangleForwardToRectangles(
  rectangle: Rectangle,
  transformer: GcpTransformer,
  transformOptions: TransformOptions
): Rectangle[] {
  return refineRectangleToRectangles(
    rectangle,
    (p) => transformer.transformForward(p),
    refinementOptionsFromForwardTransformOptions(transformOptions)
  )
}

export function transformRectangleBackwardToRectangles(
  rectangle: Rectangle,
  transformer: GcpTransformer,
  transformOptions: TransformOptions
): Rectangle[] {
  return refineRectangleToRectangles(
    rectangle,
    (p) => transformer.transformForward(p),
    refinementOptionsFromForwardTransformOptions(transformOptions)
  )
}
