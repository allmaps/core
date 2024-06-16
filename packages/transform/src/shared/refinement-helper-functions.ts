import {
  midPoint,
  distance,
  conformLineString,
  conformRing,
  mergeOptions
} from '@allmaps/stdlib'

import type { Point, LineString, Ring, Rectangle } from '@allmaps/types'

import type {
  TransformGcp,
  TransformGcpLine,
  TransformGcpRectangle,
  RefinementOptions
} from './types.js'

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
  minOffsetDistance: Infinity,
  minLineDistance: Infinity,
  sourceMidPointFunction: midPoint,
  destinationMidPointFunction: midPoint,
  destinationDistanceFunction: distance,
  returnDomain: 'destination'
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
  const gcpLines = gcpsToGcpLines(gcps, false)
  const refinedGcpLines = gcpLines
    .map((gcpLine) =>
      splitGcpLineRecursively(gcpLine, refinementFunction, refinementOptions, 0)
    )
    .flat(1)

  return gcpLinesToGcps(refinedGcpLines, true).map((point) =>
    refinementOptions.returnDomain == 'destination'
      ? point.destination
      : point.source
  )
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
  const gcpLines = gcpsToGcpLines(gcps, true)
  const refinedGcpLines = gcpLines
    .map((line) =>
      splitGcpLineRecursively(line, refinementFunction, refinementOptions, 0)
    )
    .flat(1)

  return gcpLinesToGcps(refinedGcpLines, false).map((point) =>
    refinementOptions.returnDomain == 'destination'
      ? point.destination
      : point.source
  )
}

export function refineRectangleToRectangles(
  rectangle: Rectangle,
  refinementFunction: (p: Point) => Point,
  partialRefinementOptions: Partial<RefinementOptions>
): Rectangle[] {
  rectangle = conformRing(rectangle) as Rectangle
  const refinementOptions = mergeOptions(
    defaultRefinementOptions,
    partialRefinementOptions
  )

  const gcpRectangle: TransformGcpRectangle = rectangle.map((point) => ({
    source: point,
    destination: refinementFunction(point)
  })) as TransformGcpRectangle
  const gcpRectangles = splitGcpRectangleRecursively(
    gcpRectangle,
    refinementFunction,
    refinementOptions,
    0
  )

  return gcpRectangles.map(
    (transformedGcpRectangle) =>
      transformedGcpRectangle.map((point) =>
        refinementOptions.returnDomain == 'destination'
          ? point.destination
          : point.source
      ) as Rectangle
  )
}

function splitGcpLineRecursively(
  gcpLine: TransformGcpLine,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions,
  depth: number
): TransformGcpLine[] {
  if (depth >= refinementOptions.maxDepth || refinementOptions.maxDepth <= 0) {
    return [gcpLine]
  }

  const sourceMidPoint = refinementOptions.sourceMidPointFunction(
    gcpLine[0].source,
    gcpLine[1].source
  )
  const destinationMidPoint = refinementOptions.destinationMidPointFunction(
    gcpLine[0].destination,
    gcpLine[1].destination
  )
  const destinationMidPointFromRefinementFunction =
    refinementFunction(sourceMidPoint)

  const destinationLineDistance = refinementOptions.destinationDistanceFunction(
    gcpLine[0].destination,
    gcpLine[1].destination
  )
  const destinationRefinedLineDistance =
    refinementOptions.destinationDistanceFunction(
      refinementFunction(gcpLine[0].source),
      refinementFunction(gcpLine[1].source)
    )
  const destinationMidPointsDistance =
    refinementOptions.destinationDistanceFunction(
      destinationMidPoint,
      destinationMidPointFromRefinementFunction
    )

  if (
    destinationMidPointsDistance / destinationLineDistance >
      refinementOptions.maxOffsetRatio &&
    destinationMidPointsDistance < refinementOptions.minOffsetDistance &&
    destinationRefinedLineDistance < refinementOptions.minLineDistance
    // destinationLineDistance > 0 // Todo: can this line be removed?
  ) {
    const newMidGcp: TransformGcp = {
      source: sourceMidPoint,
      destination: destinationMidPointFromRefinementFunction
    }

    return [
      splitGcpLineRecursively(
        [gcpLine[0], newMidGcp],
        refinementFunction,
        refinementOptions,
        depth + 1
      ),
      splitGcpLineRecursively(
        [newMidGcp, gcpLine[1]],
        refinementFunction,
        refinementOptions,
        depth + 1
      )
    ].flat(1)
  } else {
    return [gcpLine]
  }
}

function splitGcpRectangleRecursively(
  gcpRectangle: TransformGcpRectangle,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions,
  depth: number
): TransformGcpRectangle[] {
  if (depth >= refinementOptions.maxDepth || refinementOptions.maxDepth <= 0) {
    return [gcpRectangle]
  }

  const gcpLine = [gcpRectangle[1], gcpRectangle[3]] as TransformGcpLine
  const refinedGcpLines = splitGcpLineRecursively(
    gcpLine,
    refinementFunction,
    { ...refinementOptions, maxDepth: 1 },
    0
  )

  if (refinedGcpLines.length > 1) {
    const newMidGcp = refinedGcpLines[0][1]

    const source01Point = refinementOptions.sourceMidPointFunction(
      gcpRectangle[0].source,
      gcpRectangle[1].source
    )
    const new01Gcp = {
      source: source01Point,
      destination: refinementFunction(source01Point)
    }
    const source12Point = refinementOptions.sourceMidPointFunction(
      gcpRectangle[1].source,
      gcpRectangle[2].source
    )
    const new12Gcp = {
      source: source12Point,
      destination: refinementFunction(source12Point)
    }
    const source23Point = refinementOptions.sourceMidPointFunction(
      gcpRectangle[2].source,
      gcpRectangle[3].source
    )
    const new23Gcp = {
      source: source23Point,
      destination: refinementFunction(source23Point)
    }
    const source30Point = refinementOptions.sourceMidPointFunction(
      gcpRectangle[3].source,
      gcpRectangle[0].source
    )
    const new30Gcp = {
      source: source30Point,
      destination: refinementFunction(source30Point)
    }

    return [
      splitGcpRectangleRecursively(
        [gcpRectangle[0], new01Gcp, newMidGcp, new30Gcp],
        refinementFunction,
        refinementOptions,
        depth + 1
      ),
      splitGcpRectangleRecursively(
        [gcpRectangle[1], new12Gcp, newMidGcp, new01Gcp],
        refinementFunction,
        refinementOptions,
        depth + 1
      ),
      splitGcpRectangleRecursively(
        [gcpRectangle[2], new23Gcp, newMidGcp, new12Gcp],
        refinementFunction,
        refinementOptions,
        depth + 1
      ),
      splitGcpRectangleRecursively(
        [gcpRectangle[3], new30Gcp, newMidGcp, new23Gcp],
        refinementFunction,
        refinementOptions,
        depth + 1
      )
    ].flat(1)
  } else {
    return [gcpRectangle]
  }
}

function gcpsToGcpLines(
  gcps: TransformGcp[],
  close = false
): TransformGcpLine[] {
  const lineCount = gcps.length - (close ? 0 : 1)

  const lines: TransformGcpLine[] = []
  for (let index = 0; index < lineCount; index++) {
    lines.push([gcps[index], gcps[(index + 1) % gcps.length]])
  }

  return lines
}

function gcpLinesToGcps(
  lines: TransformGcpLine[],
  close = false
): TransformGcp[] {
  const gcps = lines.map((line) => line[0])
  if (close) {
    gcps.push(lines[lines.length - 1][1])
  }
  return gcps
}
