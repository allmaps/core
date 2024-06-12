import { Matrix, SingularValueDecomposition } from 'ml-matrix'

import Transformation from '../transformation.js'

import type { Point } from '@allmaps/types'

export default class Projective extends Transformation {
  projectiveParametersMatrix: Matrix
  projectiveParameters: number[][]

  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 'projective', 4)

    // 2D projective (= perspective) transformation
    // See https://citeseerx.ist.psu.edu/doc/10.1.1.186.4411 for more information

    // The system of equations is solved for x and y jointly (because they are inter-related)
    // Hence projectiveCoefsMatrix and projectiveParametersMatrix are one Matrix

    // Construct 2Nx9 Matrix projectiveCoefsMatrix
    // −x0 −y0 −1  0   0   0  x'0x0 x'0y0 x'0
    // 0   0   0   −x0 −y0 −1 y'0x0 y'0y0 y'0
    // ...
    const projectiveCoefsMatrix = Matrix.zeros(2 * this.pointCount, 9)
    for (let i = 0; i < this.pointCount; i++) {
      projectiveCoefsMatrix.set(2 * i, 0, -sourcePoints[i][0])
      projectiveCoefsMatrix.set(2 * i, 1, -sourcePoints[i][1])
      projectiveCoefsMatrix.set(2 * i, 2, -1)
      projectiveCoefsMatrix.set(2 * i, 3, 0)
      projectiveCoefsMatrix.set(2 * i, 4, 0)
      projectiveCoefsMatrix.set(2 * i, 5, 0)
      projectiveCoefsMatrix.set(
        2 * i,
        6,
        destinationPoints[i][0] * sourcePoints[i][0]
      )
      projectiveCoefsMatrix.set(
        2 * i,
        7,
        destinationPoints[i][0] * sourcePoints[i][1]
      )
      projectiveCoefsMatrix.set(2 * i, 8, destinationPoints[i][0])
      projectiveCoefsMatrix.set(2 * i + 1, 0, 0)
      projectiveCoefsMatrix.set(2 * i + 1, 1, 0)
      projectiveCoefsMatrix.set(2 * i + 1, 2, 0)
      projectiveCoefsMatrix.set(2 * i + 1, 3, -sourcePoints[i][0])
      projectiveCoefsMatrix.set(2 * i + 1, 4, -sourcePoints[i][1])
      projectiveCoefsMatrix.set(2 * i + 1, 5, -1)
      projectiveCoefsMatrix.set(
        2 * i + 1,
        6,
        destinationPoints[i][1] * sourcePoints[i][0]
      )
      projectiveCoefsMatrix.set(
        2 * i + 1,
        7,
        destinationPoints[i][1] * sourcePoints[i][1]
      )
      projectiveCoefsMatrix.set(2 * i + 1, 8, destinationPoints[i][1])
    }

    // Compute the last (i.e. 9th) 'right singular vector', i.e. the one with the smallest singular value. (For a set of gcps that exactly follow a projective transformations, the singular value is null and this vector spans the null-space)
    const svd = new SingularValueDecomposition(projectiveCoefsMatrix)
    this.projectiveParametersMatrix = Matrix.from1DArray(
      3,
      3,
      svd.rightSingularVectors.getColumn(8)
    ).transpose()
    this.projectiveParameters = this.projectiveParametersMatrix.to2DArray()
  }

  // Evaluate the transformation function at a new point
  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.projectiveParameters) {
      throw new Error('projective parameters not computed')
    }

    // Apply the coefficients to the input point
    const c =
      this.projectiveParameters[0][2] * newSourcePoint[0] +
      this.projectiveParameters[1][2] * newSourcePoint[1] +
      this.projectiveParameters[2][2]
    const num1 =
      this.projectiveParameters[0][0] * newSourcePoint[0] +
      this.projectiveParameters[1][0] * newSourcePoint[1] +
      this.projectiveParameters[2][0]
    const num2 =
      this.projectiveParameters[0][1] * newSourcePoint[0] +
      this.projectiveParameters[1][1] * newSourcePoint[1] +
      this.projectiveParameters[2][1]
    const newDestinationPoint: Point = [num1 / c, num2 / c]

    return newDestinationPoint
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeX(newSourcePoint: Point): Point {
    if (!this.projectiveParameters) {
      throw new Error('projective parameters not computed')
    }

    // Apply the coefficients to the input point
    const c =
      this.projectiveParameters[0][2] * newSourcePoint[0] +
      this.projectiveParameters[1][2] * newSourcePoint[1] +
      this.projectiveParameters[2][2]
    const num1 =
      this.projectiveParameters[0][0] * newSourcePoint[0] +
      this.projectiveParameters[1][0] * newSourcePoint[1] +
      this.projectiveParameters[2][0]
    const num2 =
      this.projectiveParameters[0][1] * newSourcePoint[0] +
      this.projectiveParameters[1][1] * newSourcePoint[1] +
      this.projectiveParameters[2][1]
    const newDestinationPointPartDerX: Point = [
      (c * this.projectiveParameters[0][0] -
        this.projectiveParameters[0][2] * num1) /
        c ** 2,
      (c * this.projectiveParameters[0][1] -
        this.projectiveParameters[0][2] * num2) /
        c ** 2
    ]

    return newDestinationPointPartDerX
  }

  // Evaluate the transformation function's partial derivative to y at a new point
  evaluatePartialDerivativeY(newSourcePoint: Point): Point {
    if (!this.projectiveParameters) {
      throw new Error('projective parameters not computed')
    }

    // Apply the coefficients to the input point
    const c =
      this.projectiveParameters[0][2] * newSourcePoint[0] +
      this.projectiveParameters[1][2] * newSourcePoint[1] +
      this.projectiveParameters[2][2]
    const num1 =
      this.projectiveParameters[0][0] * newSourcePoint[0] +
      this.projectiveParameters[1][0] * newSourcePoint[1] +
      this.projectiveParameters[2][0]
    const num2 =
      this.projectiveParameters[0][1] * newSourcePoint[0] +
      this.projectiveParameters[1][1] * newSourcePoint[1] +
      this.projectiveParameters[2][1]
    const newDestinationPointPartDerY: Point = [
      (c * this.projectiveParameters[1][0] -
        this.projectiveParameters[1][2] * num1) /
        c ** 2,
      (c * this.projectiveParameters[1][1] -
        this.projectiveParameters[1][2] * num2) /
        c ** 2
    ]

    return newDestinationPointPartDerY
  }
}
