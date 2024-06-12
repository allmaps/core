import Helmert from '../transformation-types/helmert.js'

import Transformation from '../transformation.js'

import type { Point } from '@allmaps/types'

export default class Straight extends Transformation {
  scale?: number
  sourcePointsCenter: Point
  destinationPointsCenter: Point
  translation?: Point

  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 'straight', 2)

    // Compute the corrensponing Helmert transform and get the scale from it
    const helmertTransformation = new Helmert(
      this.sourcePoints,
      this.destinationPoints
    )
    this.scale = helmertTransformation.scale

    if (!this.scale) {
      throw new Error('Scale could not be computed')
    }

    // Compute the centers of the source points and destination points
    this.sourcePointsCenter = this.sourcePoints
      .reduce((center, point) => [center[0] + point[0], center[1] + point[1]])
      .map((coordinate) => coordinate / this.pointCount) as Point
    this.destinationPointsCenter = this.destinationPoints
      .reduce((center, point) => [center[0] + point[0], center[1] + point[1]])
      .map((coordinate) => coordinate / this.pointCount) as Point

    // Compute the translation vector from the (scaled) center of the source points to the center of the destination points
    const scale = this.scale
    this.translation = this.destinationPointsCenter.map(
      (coord, i) => coord - this.sourcePointsCenter[i] * scale
    ) as Point
  }

  // Evaluate the transformation function at a new point
  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.scale || !this.translation) {
      throw new Error('Straight parameters not computed')
    }

    const newDestinationPoint: Point = [
      this.translation[0] + this.scale * newSourcePoint[0],
      this.translation[1] + this.scale * newSourcePoint[1]
    ]

    return newDestinationPoint
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeX(_newSourcePoint: Point): Point {
    if (!this.scale || !this.translation) {
      throw new Error('Straight parameters not computed')
    }

    const newDestinationPointPartDerX: Point = [this.scale, 0]

    return newDestinationPointPartDerX
  }

  // Evaluate the transformation function's partial derivative to y at a new point
  evaluatePartialDerivativeY(_newSourcePoint: Point): Point {
    if (!this.scale || !this.translation) {
      throw new Error('Straight parameters not computed')
    }

    const newDestinationPointPartDerY: Point = [0, this.scale]

    return newDestinationPointPartDerY
  }
}
