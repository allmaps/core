import {
  midPoint,
  distance,
  conformLineString,
  conformRing,
  mergeOptions
} from '@allmaps/stdlib'

import type { Point, LineString, Ring } from '@allmaps/types'

import type {
  RefinementSegment,
  RefinementGcp,
  RefinementOptions
} from './types.js'

export const defaultRefinementOptions: RefinementOptions = {
  maxOffsetRatio: 0,
  maxDepth: 0,
  unrefinedMidPointFunction: midPoint,
  refinedMidPointFunction: midPoint,
  refinedDistanceFunction: distance
}

function gcpsToSegments(
  gcps: RefinementGcp[],
  close = false
): RefinementSegment[] {
  const segmentCount = gcps.length - (close ? 0 : 1)

  const segments: RefinementSegment[] = []
  for (let index = 0; index < segmentCount; index++) {
    segments.push({
      from: gcps[index],
      to: gcps[(index + 1) % gcps.length]
    })
  }

  return segments
}

function segmentsToGcps(
  segments: RefinementSegment[],
  close = false
): RefinementGcp[] {
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

  const gcps: RefinementGcp[] = lineString.map((point) => ({
    unrefined: point,
    refined: refinementFunction(point)
  }))
  const segments = gcpsToSegments(gcps, false)
  const refinedSegments = refineSegments(
    segments,
    refinementFunction,
    refinementOptions
  )

  return segmentsToGcps(refinedSegments, true).map((point) => point.refined)
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

  const gcps: RefinementGcp[] = ring.map((point) => ({
    unrefined: point,
    refined: refinementFunction(point)
  }))
  const segments = gcpsToSegments(gcps, true)
  const refinedSegments = refineSegments(
    segments,
    refinementFunction,
    refinementOptions
  )

  return segmentsToGcps(refinedSegments, false).map((point) => point.refined)
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
