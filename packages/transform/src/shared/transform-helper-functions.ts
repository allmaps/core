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
  Segment,
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

export function refinementOptionsForwardTransform(
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

export function refinementOptionsBackwardTransform(
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
  transformer: GcpTransformer,
  lineString: LineString,
  transformOptions: TransformOptions
): LineString {
  lineString = conformLineString(lineString)

  const points: RefinementGcp[] = lineString.map((point) => ({
    unrefined: point,
    refined: transformer.transformForward(point)
  }))

  const segments = pointsToSegments(points, false)
  const extendedSegments =
    recursivelyAddMidpointsWithDestinationMidPointFromTransform(
      segments,
      (p) => transformer.transformForward(p),
      refinementOptionsForwardTransform(transformOptions)
    )

  return segmentsToPoints(extendedSegments, true).map((point) => point.refined)
}

export function transformLineStringBackwardToLineString(
  transformer: GcpTransformer,
  lineString: LineString,
  transformOptions: TransformOptions
): LineString {
  lineString = conformLineString(lineString)

  const points: RefinementGcp[] = lineString.map((point) => ({
    unrefined: point,
    refined: transformer.transformBackward(point)
  }))

  const segments = pointsToSegments(points, false)
  const extendendSegements =
    recursivelyAddMidpointsWithSourceMidPointFromTransform(
      segments,
      (p) => transformer.transformBackward(p),
      refinementOptionsBackwardTransform(transformOptions)
    )

  return segmentsToPoints(extendendSegements, true).map(
    (point) => point.refined
  )
}

export function transformRingForwardToRing(
  transformer: GcpTransformer,
  ring: Ring,
  transformOptions: TransformOptions
): Ring {
  ring = conformRing(ring)

  const points: RefinementGcp[] = ring.map((point) => ({
    unrefined: point,
    refined: transformer.transformForward(point)
  }))

  const segments = pointsToSegments(points, true)
  const extendedSegments =
    recursivelyAddMidpointsWithDestinationMidPointFromTransform(
      segments,
      (p) => transformer.transformForward(p),
      refinementOptionsForwardTransform(transformOptions)
    )

  return segmentsToPoints(extendedSegments, false).map((point) => point.refined)
}

export function transformRingBackwardToRing(
  transformer: GcpTransformer,
  ring: Ring,
  transformOptions: TransformOptions
): Ring {
  ring = conformRing(ring)

  const points: RefinementGcp[] = ring.map((point) => ({
    unrefined: point,
    refined: transformer.transformBackward(point)
  }))

  const segments = pointsToSegments(points, true)
  const extendendSegements =
    recursivelyAddMidpointsWithSourceMidPointFromTransform(
      segments,
      (p) => transformer.transformBackward(p),
      refinementOptionsBackwardTransform(transformOptions)
    )

  return segmentsToPoints(extendendSegements, false).map(
    (point) => point.refined
  )
}

export function transformPolygonForwardToPolygon(
  transformer: GcpTransformer,
  polygon: Polygon,
  options: TransformOptions
): Polygon {
  return polygon.map((ring) => {
    return transformRingForwardToRing(transformer, ring, options)
  })
}

export function transformPolygonBackwardToPolygon(
  transformer: GcpTransformer,
  polygon: Polygon,
  options: TransformOptions
): Polygon {
  return polygon.map((ring) => {
    return transformRingBackwardToRing(transformer, ring, options)
  })
}

function pointsToSegments(points: RefinementGcp[], close = false): Segment[] {
  const segmentCount = points.length - (close ? 0 : 1)

  const segments: Segment[] = []
  for (let index = 0; index < segmentCount; index++) {
    segments.push({
      from: points[index],
      to: points[(index + 1) % points.length]
    })
  }

  return segments
}

function segmentsToPoints(segments: Segment[], close = false): RefinementGcp[] {
  const points = segments.map((segment) => segment.from)
  if (close) {
    points.push(segments[segments.length - 1].to)
  }
  return points
}

function recursivelyAddMidpointsWithDestinationMidPointFromTransform(
  segments: Segment[],
  transformFunction: (p: Point) => Point,
  options: RefinementOptions
) {
  if (options.maxDepth <= 0) {
    return segments
  }

  return segments
    .map((segment) =>
      addMidpointWithDestinationMidPointFromTransform(
        segment,
        transformFunction,
        options,
        0
      )
    )
    .flat(1)
}

function recursivelyAddMidpointsWithSourceMidPointFromTransform(
  segments: Segment[],
  transformFunction: (p: Point) => Point,
  options: RefinementOptions
) {
  if (options.maxDepth <= 0) {
    return segments
  }

  return segments
    .map((segment) =>
      addMidpointWithSourceMidPointFromTransform(
        segment,
        transformFunction,
        options,
        0
      )
    )
    .flat(1)
}

function addMidpointWithDestinationMidPointFromTransform(
  segment: Segment,
  transformFunction: (p: Point) => Point,
  options: RefinementOptions,
  depth: number
): Segment | Segment[] {
  if (depth >= options.maxDepth) {
    return segment
  }
  const unrefinedMidPoint = options.unrefinedMidPointFunction(
    segment.from.unrefined,
    segment.to.unrefined
  )
  const refinedMidPoint = options.refinedMidPointFunction(
    segment.from.refined,
    segment.to.refined
  )
  const refinedMidPointFromTransform = transformFunction(unrefinedMidPoint)

  const segmentRefinedDistance = options.refinedDistanceFunction(
    segment.from.refined,
    segment.to.refined
  )
  const refinedMidPointsDistance = options.refinedDistanceFunction(
    refinedMidPoint,
    refinedMidPointFromTransform
  )

  if (
    refinedMidPointsDistance / segmentRefinedDistance >
      options.maxOffsetRatio &&
    segmentRefinedDistance > 0
  ) {
    const newSegmentMidpoint: RefinementGcp = {
      unrefined: unrefinedMidPoint,
      refined: refinedMidPointFromTransform
    }

    return [
      addMidpointWithDestinationMidPointFromTransform(
        { from: segment.from, to: newSegmentMidpoint },
        transformFunction,
        options,
        depth + 1
      ),
      addMidpointWithDestinationMidPointFromTransform(
        { from: newSegmentMidpoint, to: segment.to },
        transformFunction,
        options,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}

function addMidpointWithSourceMidPointFromTransform(
  segment: Segment,
  transformFunction: (p: Point) => Point,
  options: RefinementOptions,
  depth: number
): Segment | Segment[] {
  if (depth >= options.maxDepth) {
    return segment
  }

  const unrefinedMidPoint = options.unrefinedMidPointFunction(
    segment.from.unrefined,
    segment.to.unrefined
  )
  const refinedMidPoint = options.refinedMidPointFunction(
    segment.from.refined,
    segment.to.refined
  )
  const refinedMidPointFromTransform = transformFunction(
    unrefinedMidPoint as Point
  )

  const segmentRefinedDistance = options.refinedDistanceFunction(
    segment.from.refined,
    segment.to.refined
  )
  const refinedMidPointsDistance = options.refinedDistanceFunction(
    refinedMidPoint,
    refinedMidPointFromTransform
  )

  if (
    refinedMidPointsDistance / segmentRefinedDistance >
      options.maxOffsetRatio &&
    segmentRefinedDistance > 0
  ) {
    const newSegmentMidpoint: RefinementGcp = {
      refined: refinedMidPointFromTransform,
      unrefined: unrefinedMidPoint
    }

    return [
      addMidpointWithSourceMidPointFromTransform(
        { from: segment.from, to: newSegmentMidpoint },
        transformFunction,
        options,
        depth + 1
      ),
      addMidpointWithSourceMidPointFromTransform(
        { from: newSegmentMidpoint, to: segment.to },
        transformFunction,
        options,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}
