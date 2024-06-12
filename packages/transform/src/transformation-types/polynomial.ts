import { Matrix, pseudoInverse } from 'ml-matrix'

import Transformation from '../transformation.js'

import type { Point } from '@allmaps/types'
import type { TransformationType } from '../shared/types.js'

export default class Polynomial extends Transformation {
  polynomialParametersMatrices: [Matrix, Matrix]
  polynomialParameters: [number[], number[]]

  order: number
  pointCountMinimum: number

  constructor(
    sourcePoints: Point[],
    destinationPoints: Point[],
    order?: number
  ) {
    order = order || 1
    const pointsCountMinimum = ((order + 1) * (order + 2)) / 2
    // If there are less control points then there are coefficients to be determined (for each dimension), the system can not be solved

    super(
      sourcePoints,
      destinationPoints,
      ('polynomial' + order) as TransformationType,
      pointsCountMinimum
    )

    this.order = order
    this.pointCountMinimum = pointsCountMinimum

    if (this.order < 1 || this.order > 3) {
      throw new Error(
        'Only polynomial transformations of order 1, 2 or 3 are supported'
      )
    }

    // 2D polynomial transformation of order 1, 2 or 3
    // This solution uses the 'Pseudo Inverse' for estimating a least-square solution, see https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse

    // The system of equations is solved for x and y separately (because they are independent)
    // Hence destinationPointsMatrices and polynomialParametersMatrices are one Matrix
    // Since they both use the same coefficients, there is only one polynomialCoefsMatrix

    const destinationPointsMatrices: [Matrix, Matrix] = [
      Matrix.columnVector(this.destinationPoints.map((value) => value[0])),
      Matrix.columnVector(this.destinationPoints.map((value) => value[1]))
    ]

    // Construct Nx3 Matrix polynomialCoefsMatrix
    // for order = 1
    // 1 x0 y0
    // 1 x1 y1
    // 1 x2 y2
    // ...
    // for order = 2
    // 1 x0 y0 x0^2 y0^2 x0*y0
    // ...
    // for order = 3
    // 1 x0 y0 x0^2 y0^2 x0*y0 x0^3 y0^3 x0^2*y0 x0*y0^2
    // ...
    const polynomialCoefsMatrix = Matrix.zeros(
      this.pointCount,
      this.pointCountMinimum
    )
    for (let i = 0; i < this.pointCount; i++) {
      switch (this.order) {
        case 1:
          polynomialCoefsMatrix.set(i, 0, 1)
          polynomialCoefsMatrix.set(i, 1, this.sourcePoints[i][0])
          polynomialCoefsMatrix.set(i, 2, this.sourcePoints[i][1])
          break

        case 2:
          polynomialCoefsMatrix.set(i, 0, 1)
          polynomialCoefsMatrix.set(i, 1, this.sourcePoints[i][0])
          polynomialCoefsMatrix.set(i, 2, this.sourcePoints[i][1])
          polynomialCoefsMatrix.set(i, 3, this.sourcePoints[i][0] ** 2)
          polynomialCoefsMatrix.set(i, 4, this.sourcePoints[i][1] ** 2)
          polynomialCoefsMatrix.set(
            i,
            5,
            this.sourcePoints[i][0] * this.sourcePoints[i][1]
          )
          break

        case 3:
          polynomialCoefsMatrix.set(i, 0, 1)
          polynomialCoefsMatrix.set(i, 1, this.sourcePoints[i][0])
          polynomialCoefsMatrix.set(i, 2, this.sourcePoints[i][1])
          polynomialCoefsMatrix.set(i, 3, this.sourcePoints[i][0] ** 2)
          polynomialCoefsMatrix.set(i, 4, this.sourcePoints[i][1] ** 2)
          polynomialCoefsMatrix.set(
            i,
            5,
            this.sourcePoints[i][0] * this.sourcePoints[i][1]
          )
          polynomialCoefsMatrix.set(i, 6, this.sourcePoints[i][0] ** 3)
          polynomialCoefsMatrix.set(i, 7, this.sourcePoints[i][1] ** 3)
          polynomialCoefsMatrix.set(
            i,
            8,
            this.sourcePoints[i][0] ** 2 * this.sourcePoints[i][1]
          )
          polynomialCoefsMatrix.set(
            i,
            9,
            this.sourcePoints[i][0] * this.sourcePoints[i][1] ** 2
          )
          break

        default:
          break
      }
    }

    // Compute polynomial parameters by solving the linear system of equations for each component
    // Note: this solution uses the 'pseudo inverse' see https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse
    // This wil result in:
    // For order = 1: polynomialParametersMatrices = [Matrix([[a0_x], [ax_x], [ay_x]]), Matrix([[a0_y], [ax_y], [ay_y]])]
    // For order = 2: ... (simirlar, following the same order as in polynomialCoefsMatrix)
    // For order = 3: ... (simirlar, following the same order as in polynomialCoefsMatrix)
    const pseudoInversePolynomialCoefsMatrix = pseudoInverse(
      polynomialCoefsMatrix
    )
    this.polynomialParametersMatrices = [
      pseudoInversePolynomialCoefsMatrix.mmul(destinationPointsMatrices[0]),
      pseudoInversePolynomialCoefsMatrix.mmul(destinationPointsMatrices[1])
    ]
    this.polynomialParameters = this.polynomialParametersMatrices.map(
      (matrix) => matrix.to1DArray()
    ) as [number[], number[]]
  }

  // Evaluate the transformation function at a new point
  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.polynomialParameters) {
      throw new Error('Polynomial parameters not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPoint: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      switch (this.order) {
        case 1:
          newDestinationPoint[i] +=
            this.polynomialParameters[i][0] +
            this.polynomialParameters[i][1] * newSourcePoint[0] +
            this.polynomialParameters[i][2] * newSourcePoint[1]
          break

        case 2:
          newDestinationPoint[i] +=
            this.polynomialParameters[i][0] +
            this.polynomialParameters[i][1] * newSourcePoint[0] +
            this.polynomialParameters[i][2] * newSourcePoint[1] +
            this.polynomialParameters[i][3] * newSourcePoint[0] ** 2 +
            this.polynomialParameters[i][4] * newSourcePoint[1] ** 2 +
            this.polynomialParameters[i][5] *
              newSourcePoint[0] *
              newSourcePoint[1]
          break

        case 3:
          newDestinationPoint[i] +=
            this.polynomialParameters[i][0] +
            this.polynomialParameters[i][1] * newSourcePoint[0] +
            this.polynomialParameters[i][2] * newSourcePoint[1] +
            this.polynomialParameters[i][3] * newSourcePoint[0] ** 2 +
            this.polynomialParameters[i][4] * newSourcePoint[1] ** 2 +
            this.polynomialParameters[i][5] *
              newSourcePoint[0] *
              newSourcePoint[1] +
            this.polynomialParameters[i][6] * newSourcePoint[0] ** 3 +
            this.polynomialParameters[i][7] * newSourcePoint[1] ** 3 +
            this.polynomialParameters[i][8] *
              newSourcePoint[0] ** 2 *
              newSourcePoint[1] +
            this.polynomialParameters[i][9] *
              newSourcePoint[0] *
              newSourcePoint[1] ** 2
          break

        default:
          break
      }
    }

    return newDestinationPoint
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeX(newSourcePoint: Point): Point {
    if (!this.polynomialParameters) {
      throw new Error('Polynomial parameters not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPointPartDerX: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      switch (this.order) {
        case 1:
          newDestinationPointPartDerX[i] += this.polynomialParameters[i][1]
          break

        case 2:
          newDestinationPointPartDerX[i] +=
            this.polynomialParameters[i][1] +
            2 * this.polynomialParameters[i][3] * newSourcePoint[0] +
            this.polynomialParameters[i][5] * newSourcePoint[1]
          break

        case 3:
          newDestinationPointPartDerX[i] +=
            this.polynomialParameters[i][1] +
            2 * this.polynomialParameters[i][3] * newSourcePoint[0] +
            this.polynomialParameters[i][5] * newSourcePoint[1] +
            3 * this.polynomialParameters[i][6] * newSourcePoint[0] ** 2 +
            2 *
              this.polynomialParameters[i][8] *
              newSourcePoint[0] *
              newSourcePoint[1] +
            this.polynomialParameters[i][9] * newSourcePoint[1] ** 2
          break

        default:
          break
      }
    }

    return newDestinationPointPartDerX
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeY(newSourcePoint: Point): Point {
    if (!this.polynomialParameters) {
      throw new Error('Polynomial parameters not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPointPartDerY: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      switch (this.order) {
        case 1:
          newDestinationPointPartDerY[i] += this.polynomialParameters[i][2]
          break

        case 2:
          newDestinationPointPartDerY[i] +=
            this.polynomialParameters[i][2] +
            2 * this.polynomialParameters[i][4] * newSourcePoint[1] +
            this.polynomialParameters[i][5] * newSourcePoint[0]
          break

        case 3:
          newDestinationPointPartDerY[i] +=
            this.polynomialParameters[i][2] +
            2 * this.polynomialParameters[i][4] * newSourcePoint[1] +
            this.polynomialParameters[i][5] * newSourcePoint[0] +
            3 * this.polynomialParameters[i][7] * newSourcePoint[1] ** 2 +
            this.polynomialParameters[i][8] * newSourcePoint[0] ** 2 +
            2 *
              this.polynomialParameters[i][9] *
              newSourcePoint[0] *
              newSourcePoint[1]
          break

        default:
          break
      }
    }

    return newDestinationPointPartDerY
  }
}
