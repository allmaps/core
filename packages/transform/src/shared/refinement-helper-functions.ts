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
  const transformGcpLines = gcpsToTransformGcpLines(gcps, false)
  const refinedTransformGcpLines = transformGcpLines
    .map((transformGcpLine) =>
      splitTransformGcpLineRecursively(
        transformGcpLine,
        refinementFunction,
        refinementOptions,
        0
      )
    )
    .flat(1)

  return transformGcpLinesToGcps(refinedTransformGcpLines, true).map((point) =>
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
  const transformGcpLines = gcpsToTransformGcpLines(gcps, true)
  const refinedTransformGcpLines = transformGcpLines
    .map((line) =>
      splitTransformGcpLineRecursively(
        line,
        refinementFunction,
        refinementOptions,
        0
      )
    )
    .flat(1)

  return transformGcpLinesToGcps(refinedTransformGcpLines, false).map((point) =>
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

  const transformGcpRectangle: TransformGcpRectangle = rectangle.map(
    (point) => ({
      source: point,
      destination: refinementFunction(point)
    })
  ) as TransformGcpRectangle
  const transformGcpRectangles = splitTransformGcpRectangleRecursively(
    transformGcpRectangle,
    refinementFunction,
    refinementOptions,
    0
  )

  return transformGcpRectangles.map(
    (transformedGcpRectangle) =>
      transformedGcpRectangle.map((point) =>
        refinementOptions.returnDomain == 'destination'
          ? point.destination
          : point.source
      ) as Rectangle
  )
}

function splitTransformGcpLineRecursively(
  transformGcpLine: TransformGcpLine,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions,
  depth: number
): TransformGcpLine[] {
  if (depth >= refinementOptions.maxDepth || refinementOptions.maxDepth <= 0) {
    return [transformGcpLine]
  }

  const sourceMidPoint = refinementOptions.sourceMidPointFunction(
    transformGcpLine[0].source,
    transformGcpLine[1].source
  )
  const destinationMidPoint = refinementOptions.destinationMidPointFunction(
    transformGcpLine[0].destination,
    transformGcpLine[1].destination
  )
  const destinationMidPointFromRefinementFunction =
    refinementFunction(sourceMidPoint)

  const destinationLineDistance = refinementOptions.destinationDistanceFunction(
    transformGcpLine[0].destination,
    transformGcpLine[1].destination
  )
  const destinationRefinedLineDistance =
    refinementOptions.destinationDistanceFunction(
      refinementFunction(transformGcpLine[0].source),
      refinementFunction(transformGcpLine[1].source)
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
    const newMidTransformGcp: TransformGcp = {
      source: sourceMidPoint,
      destination: destinationMidPointFromRefinementFunction
    }

    return [
      splitTransformGcpLineRecursively(
        [transformGcpLine[0], newMidTransformGcp],
        refinementFunction,
        refinementOptions,
        depth + 1
      ),
      splitTransformGcpLineRecursively(
        [newMidTransformGcp, transformGcpLine[1]],
        refinementFunction,
        refinementOptions,
        depth + 1
      )
    ].flat(1)
  } else {
    return [transformGcpLine]
  }
}

function splitTransformGcpRectangleRecursively(
  transformGcpRectangle: TransformGcpRectangle,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions,
  depth: number
): TransformGcpRectangle[] {
  if (depth >= refinementOptions.maxDepth || refinementOptions.maxDepth <= 0) {
    return [transformGcpRectangle]
  }

  const transformGcpLine = [
    transformGcpRectangle[1],
    transformGcpRectangle[3]
  ] as TransformGcpLine
  const refinedTransformGcpLines = splitTransformGcpLineRecursively(
    transformGcpLine,
    refinementFunction,
    { ...refinementOptions, maxDepth: 1 },
    0
  )

  if (refinedTransformGcpLines.length > 1) {
    const newMidTransformGcp = refinedTransformGcpLines[0][1]

    const source01Point = refinementOptions.sourceMidPointFunction(
      transformGcpRectangle[0].source,
      transformGcpRectangle[1].source
    )
    const new01TransformGcp = {
      source: source01Point,
      destination: refinementFunction(source01Point)
    }
    const source12Point = refinementOptions.sourceMidPointFunction(
      transformGcpRectangle[1].source,
      transformGcpRectangle[2].source
    )
    const new12TransformGcp = {
      source: source12Point,
      destination: refinementFunction(source12Point)
    }
    const source23Point = refinementOptions.sourceMidPointFunction(
      transformGcpRectangle[2].source,
      transformGcpRectangle[3].source
    )
    const new23TransformGcp = {
      source: source23Point,
      destination: refinementFunction(source23Point)
    }
    const source30Point = refinementOptions.sourceMidPointFunction(
      transformGcpRectangle[3].source,
      transformGcpRectangle[0].source
    )
    const new30TransformGcp = {
      source: source30Point,
      destination: refinementFunction(source30Point)
    }

    return [
      splitTransformGcpRectangleRecursively(
        [
          transformGcpRectangle[0],
          new01TransformGcp,
          newMidTransformGcp,
          new30TransformGcp
        ],
        refinementFunction,
        refinementOptions,
        depth + 1
      ),
      splitTransformGcpRectangleRecursively(
        [
          transformGcpRectangle[1],
          new12TransformGcp,
          newMidTransformGcp,
          new01TransformGcp
        ],
        refinementFunction,
        refinementOptions,
        depth + 1
      ),
      splitTransformGcpRectangleRecursively(
        [
          transformGcpRectangle[2],
          new23TransformGcp,
          newMidTransformGcp,
          new12TransformGcp
        ],
        refinementFunction,
        refinementOptions,
        depth + 1
      ),
      splitTransformGcpRectangleRecursively(
        [
          transformGcpRectangle[3],
          new30TransformGcp,
          newMidTransformGcp,
          new23TransformGcp
        ],
        refinementFunction,
        refinementOptions,
        depth + 1
      )
    ].flat(1)
  } else {
    return [transformGcpRectangle]
  }
}

function gcpsToTransformGcpLines(
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

function transformGcpLinesToGcps(
  lines: TransformGcpLine[],
  close = false
): TransformGcp[] {
  const gcps = lines.map((line) => line[0])
  if (close) {
    gcps.push(lines[lines.length - 1][1])
  }
  return gcps
}
