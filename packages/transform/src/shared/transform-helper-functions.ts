// TODO: consider implementing these functions in this module instead of using dependencies
import getWorldMidpoint from '@turf/midpoint'
import getWorldDistance from '@turf/distance'

import {
  midPoint,
  distance,
  conformLineString,
  conformRing
} from '@allmaps/stdlib'

import GcpTransformer from '../transformer'

import type {
  RefinementSegment,
  TransformOptions,
  RefinementGcp,
  RefinementOptions
} from './types.js'

import type { Point, LineString, Ring, Polygon } from '@allmaps/types'

export function mergeTransformOptionsAndSetDetault(
  partialTransformOptions0?: Partial<TransformOptions>,
  partialTransformOptions1?: Partial<TransformOptions>
): TransformOptions {
  const defaultTransformOptions: TransformOptions = {
    maxOffsetRatio: 0,
    maxDepth: 0,
    destinationIsGeographic: false,
    sourceIsGeographic: false,
    inputIsMultiGeometry: false,
    differentHandedness: false,
    evaluationType: 'function'
  }

  // This function is a little expensive and is executed for every point
  // so small speed-ups like this make for a 50% speed increase when transforming a lot of points
  if (!partialTransformOptions0 && !partialTransformOptions1) {
    return defaultTransformOptions
  } else if (partialTransformOptions0 && !partialTransformOptions1) {
    return {
      ...defaultTransformOptions,
      ...partialTransformOptions0
    }
  } else if (!partialTransformOptions0 && partialTransformOptions1) {
    return {
      ...defaultTransformOptions,
      ...partialTransformOptions1
    }
  } else {
    return {
      ...defaultTransformOptions,
      ...partialTransformOptions0,
      ...partialTransformOptions1
    }
  }
}

export function refinementOptionsFromForwardTransformOptions(
  transformOptions: TransformOptions
): RefinementOptions {
  return {
    maxOffsetRatio: transformOptions.maxOffsetRatio,
    maxDepth: transformOptions.maxDepth,
    unrefinedMidPointFunction: transformOptions.sourceIsGeographic
      ? (point0: Point, point1: Point) =>
          getWorldMidpoint(point0, point1).geometry.coordinates as Point
      : midPoint,
    refinedMidPointFunction: transformOptions.destinationIsGeographic
      ? (point0: Point, point1: Point) =>
          getWorldMidpoint(point0, point1).geometry.coordinates as Point
      : midPoint,
    refinedDistanceFunction: transformOptions.destinationIsGeographic
      ? getWorldDistance
      : distance
  }
}

export function refinementOptionsFromBackwardTransformOptions(
  transformOptions: TransformOptions
): RefinementOptions {
  return {
    maxOffsetRatio: transformOptions.maxOffsetRatio,
    maxDepth: transformOptions.maxDepth,
    unrefinedMidPointFunction: transformOptions.destinationIsGeographic
      ? (point0: Point, point1: Point) =>
          getWorldMidpoint(point0, point1).geometry.coordinates as Point
      : midPoint,
    refinedMidPointFunction: transformOptions.sourceIsGeographic
      ? (point0: Point, point1: Point) =>
          getWorldMidpoint(point0, point1).geometry.coordinates as Point
      : midPoint,
    refinedDistanceFunction: transformOptions.sourceIsGeographic
      ? getWorldDistance
      : distance
  }
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

////////

function pointsToSegments(
  points: RefinementGcp[],
  close = false
): RefinementSegment[] {
  const segmentCount = points.length - (close ? 0 : 1)

  const segments: RefinementSegment[] = []
  for (let index = 0; index < segmentCount; index++) {
    segments.push({
      from: points[index],
      to: points[(index + 1) % points.length]
    })
  }

  return segments
}

function segmentsToPoints(
  segments: RefinementSegment[],
  close = false
): RefinementGcp[] {
  const points = segments.map((segment) => segment.from)
  if (close) {
    points.push(segments[segments.length - 1].to)
  }
  return points
}

export function refineLineString(
  lineString: LineString,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions
): LineString {
  lineString = conformLineString(lineString)

  const points: RefinementGcp[] = lineString.map((point) => ({
    unrefined: point,
    refined: refinementFunction(point)
  }))
  const segments = pointsToSegments(points, false)
  const refinedSegments = refineSegments(
    segments,
    refinementFunction,
    refinementOptions
  )

  return segmentsToPoints(refinedSegments, true).map((point) => point.refined)
}

export function refineRing(
  ring: Ring,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions
): Ring {
  ring = conformRing(ring)

  const points: RefinementGcp[] = ring.map((point) => ({
    unrefined: point,
    refined: refinementFunction(point)
  }))
  const segments = pointsToSegments(points, true)
  const refinedSegments = refineSegments(
    segments,
    refinementFunction,
    refinementOptions
  )

  return segmentsToPoints(refinedSegments, false).map((point) => point.refined)
}

function refineSegments(
  segments: RefinementSegment[],
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions
): RefinementSegment[] {
  if (refinementOptions.maxDepth <= 0) {
    return segments
  }

  return segments
    .map((segment) =>
      splitSegmentRecursively(segment, refinementFunction, refinementOptions, 0)
    )
    .flat(1)
}

function splitSegmentRecursively(
  segment: RefinementSegment,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions,
  depth: number
): RefinementSegment | RefinementSegment[] {
  if (depth >= refinementOptions.maxDepth) {
    return segment
  }
  const unrefinedMidPoint = refinementOptions.unrefinedMidPointFunction(
    segment.from.unrefined,
    segment.to.unrefined
  )
  const refinedMidPoint = refinementOptions.refinedMidPointFunction(
    segment.from.refined,
    segment.to.refined
  )
  const refinedMidPointFromTransform = refinementFunction(unrefinedMidPoint)

  const segmentRefinedDistance = refinementOptions.refinedDistanceFunction(
    segment.from.refined,
    segment.to.refined
  )
  const refinedMidPointsDistance = refinementOptions.refinedDistanceFunction(
    refinedMidPoint,
    refinedMidPointFromTransform
  )

  if (
    refinedMidPointsDistance / segmentRefinedDistance >
      refinementOptions.maxOffsetRatio &&
    segmentRefinedDistance > 0
  ) {
    const newSegmentMidpoint: RefinementGcp = {
      unrefined: unrefinedMidPoint,
      refined: refinedMidPointFromTransform
    }

    return [
      splitSegmentRecursively(
        { from: segment.from, to: newSegmentMidpoint },
        refinementFunction,
        refinementOptions,
        depth + 1
      ),
      splitSegmentRecursively(
        { from: newSegmentMidpoint, to: segment.to },
        refinementFunction,
        refinementOptions,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}
