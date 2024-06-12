import { Matrix, pseudoInverse } from 'ml-matrix'

import Transformation from '../transformation.js'

import type { Point } from '@allmaps/types'

export default class Helmert extends Transformation {
  helmertParametersMatrix: Matrix
  helmertParameters: number[]

  scale?: number
  rotation?: number
  translation?: Point

  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 'helmert', 2)

    // 2D Helmert transformation (= similarity transformation)
    // This solution uses the 'Pseudo Inverse' for estimating a least-square solution, see https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse

    // The system of equations is solved for x and y jointly (because they are inter-related)
    // Hence destinationPointsMatrix, helmertCoefsMatrix and helmertParametersMatrix are one Matrix

    const destinationPointsMatrix: Matrix = Matrix.columnVector(
      destinationPoints.flat()
    )

    // Construct 2Nx4 Matrix helmertCoefsMatrix
    // 1 0 x0 -y0
    // 0 1 y0 x0
    // 1 0 x1 -y1
    // 0 1 y1 x1
    // ...
    const helmertCoefsMatrix = Matrix.zeros(2 * this.pointCount, 4)
    for (let i = 0; i < this.pointCount; i++) {
      helmertCoefsMatrix.set(2 * i, 0, 1)
      helmertCoefsMatrix.set(2 * i, 1, 0)
      helmertCoefsMatrix.set(2 * i, 2, this.sourcePoints[i][0])
      helmertCoefsMatrix.set(2 * i, 3, -this.sourcePoints[i][1])
      helmertCoefsMatrix.set(2 * i + 1, 0, 0)
      helmertCoefsMatrix.set(2 * i + 1, 1, 1)
      helmertCoefsMatrix.set(2 * i + 1, 2, this.sourcePoints[i][1])
      helmertCoefsMatrix.set(2 * i + 1, 3, this.sourcePoints[i][0])
    }

    // Compute helmert parameters by solving the linear system of equations for each component
    // Will result in a Matrix([[t_x], [t_y], [m], [n]])
    const pseudoInverseHelmertCoefsMatrix = pseudoInverse(helmertCoefsMatrix)
    this.helmertParametersMatrix = pseudoInverseHelmertCoefsMatrix.mmul(
      destinationPointsMatrix
    )
    this.helmertParameters = this.helmertParametersMatrix.to1DArray()

    // Set the derived parameters
    this.scale = Math.sqrt(
      this.helmertParameters[2] ** 2 + this.helmertParameters[3] ** 2
    )
    this.rotation = Math.atan2(
      this.helmertParameters[3],
      this.helmertParameters[2]
    )
    this.translation = [this.helmertParameters[0], this.helmertParameters[1]]
  }

  // Evaluate the transformation function at a new point
  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.helmertParameters) {
      throw new Error('Helmert parameters not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPoint: Point = [
      this.helmertParameters[0] +
        this.helmertParameters[2] * newSourcePoint[0] -
        this.helmertParameters[3] * newSourcePoint[1],
      this.helmertParameters[1] +
        this.helmertParameters[2] * newSourcePoint[1] +
        this.helmertParameters[3] * newSourcePoint[0]
    ]
    // Alternatively, using derived helmert parameters
    // this.translation[0] +
    //   this.scale * Math.cos(rotation) * newSourcePoint[0] -
    //   this.scale * Math.sin(rotation) * newSourcePoint[1],
    // this.translation[1] +
    //   this.scale * Math.cos(rotation) * newSourcePoint[1] +
    //   this.scale * Math.sin(rotation) * newSourcePoint[0]

    return newDestinationPoint
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeX(_newSourcePoint: Point): Point {
    if (!this.helmertParameters) {
      throw new Error('Helmert parameters not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPointPartDerX: Point = [
      this.helmertParameters[2],
      this.helmertParameters[3]
    ]

    return newDestinationPointPartDerX
  }

  // Evaluate the transformation function's partial derivative to y at a new point
  evaluatePartialDerivativeY(_newSourcePoint: Point): Point {
    if (!this.helmertParameters) {
      throw new Error('Helmert parameters not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPointPartDerY: Point = [
      -this.helmertParameters[3],
      this.helmertParameters[2]
    ]

    return newDestinationPointPartDerY
  }
}
