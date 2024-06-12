import { Matrix, inverse } from 'ml-matrix'

import Transformation from '../transformation.js'

import type { KernelFunction, NormFunction } from '../shared/types.js'

import type { Point } from '@allmaps/types'

export default class RBF extends Transformation {
  kernelFunction: KernelFunction
  normFunction: NormFunction

  weightsMatrices: [Matrix, Matrix]
  rbfWeights: [number[], number[]]
  affineWeights: [number[], number[]]

  epsilon?: number

  constructor(
    sourcePoints: Point[],
    destinationPoints: Point[],
    kernelFunction: KernelFunction,
    normFunction: NormFunction,
    epsilon?: number
  ) {
    super(sourcePoints, destinationPoints, 'thinPlateSpline', 3)

    this.kernelFunction = kernelFunction
    this.normFunction = normFunction

    // 2D Radial Basis Function interpolation
    // See notebook https://observablehq.com/d/0b57d3b587542794 for code source and explanation

    // The system of equations is solved for x and y separately (because they are independant)
    // Hence destinationPointsMatrices and weightsMatrices are an Array of two column vector matrices
    // Since they both use the same coefficients, there is only one kernelsAndAffineCoefsMatrix

    const destinationPointsMatrices: [Matrix, Matrix] = [
      Matrix.columnVector(
        [...this.destinationPoints, [0, 0], [0, 0], [0, 0]].map(
          (value) => value[0]
        )
      ),
      Matrix.columnVector(
        [...this.destinationPoints, [0, 0], [0, 0], [0, 0]].map(
          (value) => value[1]
        )
      )
    ]

    // Pre-compute kernelsMatrix: fill it with the point to point distances between all control points
    const kernelsMatrix = Matrix.zeros(this.pointCount, this.pointCount)
    for (let i = 0; i < this.pointCount; i++) {
      for (let j = 0; j < this.pointCount; j++) {
        kernelsMatrix.set(
          i,
          j,
          normFunction(this.sourcePoints[i], this.sourcePoints[j])
        )
      }
    }

    // If it's not provided, and if it's an input to the kernelFunction,
    // compute epsilon as the average distance between the control points
    if (epsilon === undefined) {
      epsilon =
        kernelsMatrix.sum() / (Math.pow(this.pointCount, 2) - this.pointCount)
    }

    this.epsilon = epsilon

    // Finish the computation of kernelsMatrix by applying the requested kernel function
    for (let i = 0; i < this.pointCount; i++) {
      for (let j = 0; j < this.pointCount; j++) {
        kernelsMatrix.set(
          i,
          j,
          kernelFunction(kernelsMatrix.get(i, j), { epsilon: epsilon })
        )
      }
    }

    // Extend kernelsMatrix to include the affine transformation
    const affineCoefsMatrix = Matrix.zeros(this.pointCount, 3)
    const kernelsAndAffineCoefsMatrix = Matrix.zeros(
      this.pointCount + 3,
      this.pointCount + 3
    )
    // Construct Nx3 Matrix affineCoefsMatrix
    // 1 x0 y0
    // 1 x1 y1
    // 1 x2 y2
    // ...
    for (let i = 0; i < this.pointCount; i++) {
      affineCoefsMatrix.set(i, 0, 1)
      affineCoefsMatrix.set(i, 1, this.sourcePoints[i][0])
      affineCoefsMatrix.set(i, 2, this.sourcePoints[i][1])
    }
    // Combine kernelsMatrix and affineCoefsMatrix into new matrix kernelsAndAffineCoefsMatrix
    // Note: mlMatrix has no knowledge of block matrices, but this approach is good enough
    // To speed this up, we could maybe use kernelsMatrix.addRow() and kernelsMatrix.addVector()
    for (let i = 0; i < this.pointCount + 3; i++) {
      for (let j = 0; j < this.pointCount + 3; j++) {
        if (i < this.pointCount && j < this.pointCount) {
          kernelsAndAffineCoefsMatrix.set(i, j, kernelsMatrix.get(i, j))
        } else if (i >= this.pointCount && j < this.pointCount) {
          kernelsAndAffineCoefsMatrix.set(
            i,
            j,
            affineCoefsMatrix.transpose().get(i - this.pointCount, j)
          )
        } else if (i < this.pointCount && j >= this.pointCount) {
          kernelsAndAffineCoefsMatrix.set(
            i,
            j,
            affineCoefsMatrix.get(i, j - this.pointCount)
          )
        }
      }
    }

    // Compute basis functions weights and the affine parameters by solving the linear system of equations for each component
    // Note: the same kernelsAndAffineCoefsMatrix is used for both solutions
    const inverseKernelsAndAffineCoefsMatrix = inverse(
      kernelsAndAffineCoefsMatrix
    )
    this.weightsMatrices = [
      inverseKernelsAndAffineCoefsMatrix.mmul(destinationPointsMatrices[0]),
      inverseKernelsAndAffineCoefsMatrix.mmul(destinationPointsMatrices[1])
    ]

    // Store rbf and affine parts of the weights more as arrays for more efficient access on evaluation
    this.rbfWeights = this.weightsMatrices.map((matrix) =>
      matrix.selection([...Array(this.pointCount).keys()], [0]).to1DArray()
    ) as [number[], number[]]
    this.affineWeights = this.weightsMatrices.map((matrix) =>
      matrix
        .selection(
          [0, 1, 2].map((n) => n + this.pointCount),
          [0]
        )
        .to1DArray()
    ) as [number[], number[]]
  }

  // Evaluate the transformation function at a new point
  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.rbfWeights || !this.affineWeights) {
      throw new Error('Weights not computed')
    }

    // Compute the distances of that point to all control points
    const newDistances = this.sourcePoints.map((sourcePoint) =>
      this.normFunction(newSourcePoint, sourcePoint)
    )

    // Sum the weighted contributions of the input point
    const newDestinationPoint: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      // Apply the weights to the new distances
      newDestinationPoint[i] = newDistances.reduce(
        (sum, dist, index) =>
          sum +
          this.kernelFunction(dist, { epsilon: this.epsilon }) *
            this.rbfWeights[i][index],
        0
      )
      // Add the affine part
      newDestinationPoint[i] +=
        this.affineWeights[i][0] +
        this.affineWeights[i][1] * newSourcePoint[0] +
        this.affineWeights[i][2] * newSourcePoint[1]
    }
    return newDestinationPoint
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeX(newSourcePoint: Point): Point {
    if (!this.rbfWeights || !this.affineWeights) {
      throw new Error('Weights not computed')
    }

    // Compute the distances of that point to all control points
    const newDistances = this.sourcePoints.map((sourcePoint) =>
      this.normFunction(newSourcePoint, sourcePoint)
    )

    // Sum the weighted contributions of the input point
    const newDestinationPointPartDerX: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      // Apply the weights to the new distances
      newDestinationPointPartDerX[i] = newDistances.reduce(
        (sum, dist, index) =>
          sum +
          (dist == 0
            ? 0
            : this.kernelFunction(dist, {
                derivative: 1,
                epsilon: this.epsilon
              }) *
              ((newSourcePoint[0] - this.sourcePoints[index][0]) / dist) *
              this.rbfWeights[i][index]),
        0
      )
      // Add the affine part
      newDestinationPointPartDerX[i] += this.affineWeights[i][1]
    }
    return newDestinationPointPartDerX
  }

  // Evaluate the transformation function's partial derivative to y at a new point
  evaluatePartialDerivativeY(newSourcePoint: Point): Point {
    if (!this.rbfWeights || !this.affineWeights) {
      throw new Error('Weights not computed')
    }

    // Compute the distances of that point to all control points
    const newDistances = this.sourcePoints.map((sourcePoint) =>
      this.normFunction(newSourcePoint, sourcePoint)
    )

    // Sum the weighted contributions of the input point
    const newDestinationPointPartDerY: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      // Apply the weights to the new distances
      newDestinationPointPartDerY[i] = newDistances.reduce(
        (sum, dist, index) =>
          sum +
          (dist == 0
            ? 0
            : this.kernelFunction(dist, {
                derivative: 1,
                epsilon: this.epsilon
              }) *
              ((newSourcePoint[1] - this.sourcePoints[index][1]) / dist) *
              this.rbfWeights[i][index]),
        0
      )
      // Add the affine part
      newDestinationPointPartDerY[i] += this.affineWeights[i][2]
    }
    return newDestinationPointPartDerY
  }
}
