import type { Point, DbMap } from '$lib/shared/types.js'

import { getResourceMask } from '$lib/shared/maps.js'

type PointDifference = {
  index: number
  operation: 'insert' | 'replace' | 'remove'
  point: Point
}

function pointsEqual(point1: Point, point2: Point) {
  return point1[0] === point2[0] && point1[1] === point2[1]
}

export function polygonDifference(
  oldPolygon: Point[],
  newPolygon: Point[]
): PointDifference | undefined {
  const minLength = Math.min(oldPolygon.length, newPolygon.length)

  let index = 0
  for (index; index < minLength; index++) {
    if (!pointsEqual(oldPolygon[index], newPolygon[index])) {
      break
    }
  }

  if (oldPolygon.length < newPolygon.length) {
    // point inserted
    return {
      index,
      operation: 'insert',
      point: newPolygon[index]
    }
  } else if (oldPolygon.length > newPolygon.length) {
    // point removed
    return {
      index,
      operation: 'remove',
      point: oldPolygon[index]
    }
  } else if (index < minLength) {
    // point updated
    return {
      index,
      operation: 'replace',
      point: newPolygon[index]
    }
  }
}

export function getMaskExtent(map: DbMap) {
  const resourceMask = getResourceMask(map)
  const xs = resourceMask.map((point) => point[0])
  const ys = resourceMask.map((point) => point[1])

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)

  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return [
    [minX, maxX],
    [minY, maxY]
  ]
}

export function getMaskDimensions(map: DbMap) {
  const maskExtent = getMaskExtent(map)

  return [
    maskExtent[0][1] - maskExtent[0][0],
    maskExtent[1][1] - maskExtent[1][0]
  ]
}
