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

import type { TransformGcp, Segment, TransformOptions } from './types.js'

import type { Point, LineString, Ring, Polygon } from '@allmaps/types'

export function mergeTransformOptions(
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

export function transformLineStringForwardToLineString(
  transformer: GcpTransformer,
  lineString: LineString,
  options: TransformOptions
): LineString {
  lineString = conformLineString(lineString)

  const points = lineString.map((point) => ({
    source: point,
    destination: transformer.transformForward(point)
  }))

  const segments = pointsToSegments(points, false)
  const extendedSegments =
    recursivelyAddMidpointsWithDestinationMidPointFromTransform(
      transformer,
      segments,
      options
    )

  return segmentsToPoints(extendedSegments, true).map(
    (point) => point.destination
  )
}

export function transformLineStringBackwardToLineString(
  transformer: GcpTransformer,
  lineString: LineString,
  options: TransformOptions
): LineString {
  lineString = conformLineString(lineString)

  const points: TransformGcp[] = lineString.map((point) => ({
    source: transformer.transformBackward(point),
    destination: point
  }))

  const segments = pointsToSegments(points, false)
  const extendendSegements =
    recursivelyAddMidpointsWithSourceMidPointFromTransform(
      transformer,
      segments,
      options
    )

  return segmentsToPoints(extendendSegements, true).map((point) => point.source)
}

export function transformRingForwardToRing(
  transformer: GcpTransformer,
  ring: Ring,
  options: TransformOptions
): Ring {
  ring = conformRing(ring)

  const points = ring.map((point) => ({
    source: point,
    destination: transformer.transformForward(point)
  }))

  const segments = pointsToSegments(points, true)
  const extendedSegments =
    recursivelyAddMidpointsWithDestinationMidPointFromTransform(
      transformer,
      segments,
      options
    )

  return segmentsToPoints(extendedSegments, false).map(
    (point) => point.destination
  )
}

export function transformRingBackwardToRing(
  transformer: GcpTransformer,
  ring: Ring,
  options: TransformOptions
): Ring {
  ring = conformRing(ring)

  const points: TransformGcp[] = ring.map((point) => ({
    source: transformer.transformBackward(point),
    destination: point
  }))

  const segments = pointsToSegments(points, true)
  const extendendSegements =
    recursivelyAddMidpointsWithSourceMidPointFromTransform(
      transformer,
      segments,
      options
    )

  return segmentsToPoints(extendendSegements, false).map(
    (point) => point.source
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

function pointsToSegments(points: TransformGcp[], close = false): Segment[] {
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

function segmentsToPoints(segments: Segment[], close = false): TransformGcp[] {
  const points = segments.map((segment) => segment.from)
  if (close) {
    points.push(segments[segments.length - 1].to)
  }
  return points
}

function recursivelyAddMidpointsWithDestinationMidPointFromTransform(
  transformer: GcpTransformer,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0) {
    return segments
  }

  return segments
    .map((segment) =>
      addMidpointWithDestinationMidPointFromTransform(
        transformer,
        segment,
        options,
        0
      )
    )
    .flat(1)
}

function recursivelyAddMidpointsWithSourceMidPointFromTransform(
  transformer: GcpTransformer,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0) {
    return segments
  }

  return segments
    .map((segment) =>
      addMidpointWithSourceMidPointFromTransform(
        transformer,
        segment,
        options,
        0
      )
    )
    .flat(1)
}

function addMidpointWithDestinationMidPointFromTransform(
  transformer: GcpTransformer,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  if (depth >= options.maxDepth) {
    return segment
  }

  const sourceMidPointFunction = options.sourceIsGeographic
    ? (point1: Point, point2: Point) =>
        getWorldMidpoint(point1, point2).geometry.coordinates as Point
    : midPoint
  const sourceMidPoint = sourceMidPointFunction(
    segment.from.source,
    segment.to.source
  )

  const destinationMidPointFunction = options.destinationIsGeographic
    ? (point1: Point, point2: Point) =>
        getWorldMidpoint(point1, point2).geometry.coordinates as Point
    : midPoint
  const destinationMidPoint = destinationMidPointFunction(
    segment.from.destination,
    segment.to.destination
  )
  const destinationMidPointFromTransform =
    transformer.transformForward(sourceMidPoint)

  const destinationDistanceFunction = options.destinationIsGeographic
    ? getWorldDistance
    : distance
  const segmentDestinationDistance = destinationDistanceFunction(
    segment.from.destination,
    segment.to.destination
  )
  const destinationMidPointsDistance = destinationDistanceFunction(
    destinationMidPoint,
    destinationMidPointFromTransform
  )

  if (
    destinationMidPointsDistance / segmentDestinationDistance >
      options.maxOffsetRatio &&
    segmentDestinationDistance > 0
  ) {
    const newSegmentMidpoint: TransformGcp = {
      source: sourceMidPoint,
      destination: destinationMidPointFromTransform
    }

    return [
      addMidpointWithDestinationMidPointFromTransform(
        transformer,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addMidpointWithDestinationMidPointFromTransform(
        transformer,
        { from: newSegmentMidpoint, to: segment.to },
        options,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}

function addMidpointWithSourceMidPointFromTransform(
  transformer: GcpTransformer,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  if (depth >= options.maxDepth) {
    return segment
  }

  const destinationMidPointFunction = options.destinationIsGeographic
    ? (point1: Point, point2: Point) =>
        getWorldMidpoint(point1, point2).geometry.coordinates as Point
    : midPoint
  const destinationMidPoint = destinationMidPointFunction(
    segment.from.destination,
    segment.to.destination
  )

  const sourceMidPointFunction = options.sourceIsGeographic
    ? (point1: Point, point2: Point) =>
        getWorldMidpoint(point1, point2).geometry.coordinates as Point
    : midPoint
  const sourceMidPoint = sourceMidPointFunction(
    segment.from.source,
    segment.to.source
  )
  const sourceMidPointFromTransform = transformer.transformBackward(
    destinationMidPoint as Point
  )

  const sourceDistanceFunction = options.sourceIsGeographic
    ? getWorldDistance
    : distance
  const segmentSourceDistance = sourceDistanceFunction(
    segment.from.source,
    segment.to.source
  )
  const sourceMidPointsDistance = sourceDistanceFunction(
    sourceMidPoint,
    sourceMidPointFromTransform
  )

  if (
    sourceMidPointsDistance / segmentSourceDistance > options.maxOffsetRatio &&
    segmentSourceDistance > 0
  ) {
    const newSegmentMidpoint: TransformGcp = {
      source: sourceMidPointFromTransform,
      destination: destinationMidPoint
    }

    return [
      addMidpointWithSourceMidPointFromTransform(
        transformer,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addMidpointWithSourceMidPointFromTransform(
        transformer,
        { from: newSegmentMidpoint, to: segment.to },
        options,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}
