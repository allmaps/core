import {
  midPoint,
  distance,
  conformLineString,
  conformRing,
  mergeOptions
} from '@allmaps/stdlib'

import type { Point, LineString, Ring } from '@allmaps/types'

import type { Segment, TransformGcp, RefinementOptions } from './types.js'

// Note:
// The concepts of 'source' and 'destination' for refinement methods
// might differ from those in transform methods that called them.
// For forward transform methods, 'source' and 'destination' in the refinement context
// are the same as in their original transform context.
// For backward transform methods, they are inversed.
// Hence, in the refinement contect we always act source > destination.
// See the way refinement methods are called:
// with a different refinementFunction and refinementOptions for the forward and backward case.

export const defaultRefinementOptions: RefinementOptions = {
  maxOffsetRatio: 0,
  maxDepth: 0,
  sourceMidPointFunction: midPoint,
  destinationMidPointFunction: midPoint,
  destinationDistanceFunction: distance
}

function gcpsToSegments(gcps: TransformGcp[], close = false): Segment[] {
  const segmentCount = gcps.length - (close ? 0 : 1)

  const segments: Segment[] = []
  for (let index = 0; index < segmentCount; index++) {
    segments.push({
      from: gcps[index],
      to: gcps[(index + 1) % gcps.length]
    })
  }

  return segments
}

function segmentsToGcps(segments: Segment[], close = false): TransformGcp[] {
  const gcps = segments.map((segment) => segment.from)
  if (close) {
    gcps.push(segments[segments.length - 1].to)
  }
  return gcps
}

export function refineLineString(
  lineString: LineString,
  refinementFunction: (p: Point) => Point,
  partialRefinementOptions: Partial<RefinementOptions>
): LineString {
  lineString = conformLineString(lineString)
  const refinementOptions = mergeOptions(
    defaultRefinementOptions,
    partialRefinementOptions
  )

  const gcps: TransformGcp[] = lineString.map((point) => ({
    source: point,
    destination: refinementFunction(point)
  }))
  const segments = gcpsToSegments(gcps, false)
  const refinedSegments = refineSegments(
    segments,
    refinementFunction,
    refinementOptions
  )

  return segmentsToGcps(refinedSegments, true).map((point) => point.destination)
}

export function refineRing(
  ring: Ring,
  refinementFunction: (p: Point) => Point,
  partialRefinementOptions: Partial<RefinementOptions>
): Ring {
  ring = conformRing(ring)
  const refinementOptions = mergeOptions(
    defaultRefinementOptions,
    partialRefinementOptions
  )

  const gcps: TransformGcp[] = ring.map((point) => ({
    source: point,
    destination: refinementFunction(point)
  }))
  const segments = gcpsToSegments(gcps, true)
  const refinedSegments = refineSegments(
    segments,
    refinementFunction,
    refinementOptions
  )

  return segmentsToGcps(refinedSegments, false).map(
    (point) => point.destination
  )
}

function refineSegments(
  segments: Segment[],
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions
): Segment[] {
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
  segment: Segment,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions,
  depth: number
): Segment | Segment[] {
  if (depth >= refinementOptions.maxDepth) {
    return segment
  }
  const sourceMidPoint = refinementOptions.sourceMidPointFunction(
    segment.from.source,
    segment.to.source
  )
  const destinationMidPoint = refinementOptions.destinationMidPointFunction(
    segment.from.destination,
    segment.to.destination
  )
  const destinationMidPointFromRefinementFunction =
    refinementFunction(sourceMidPoint)

  const segmentRefinedDistance = refinementOptions.destinationDistanceFunction(
    segment.from.destination,
    segment.to.destination
  )
  const destinationMidPointsDistance =
    refinementOptions.destinationDistanceFunction(
      destinationMidPoint,
      destinationMidPointFromRefinementFunction
    )

  if (
    destinationMidPointsDistance / segmentRefinedDistance >
      refinementOptions.maxOffsetRatio &&
    segmentRefinedDistance > 0
  ) {
    const newSegmentMidpoint: TransformGcp = {
      source: sourceMidPoint,
      destination: destinationMidPointFromRefinementFunction
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
