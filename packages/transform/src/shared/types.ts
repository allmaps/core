import type { Point } from '@allmaps/types'

/**
 * Ground Control Point (GCP).
 * A GCP contains a mapping between a source and destination point.
 */
export type TransformGcp = { source: Point; destination: Point }

export type RefinementGcp = { unrefined: Point; refined: Point }

export type Segment = {
  from: RefinementGcp
  to: RefinementGcp
}

export type RefinementOptions = {
  maxOffsetRatio: number
  maxDepth: number
  unrefinedMidPointFunction: (p0: Point, p1: Point) => Point
  refinedMidPointFunction: (p0: Point, p1: Point) => Point
  refinedDistanceFunction: (p0: Point, p1: Point) => number
}

/** Transformation type. */
export type TransformationType =
  | 'straight'
  | 'helmert'
  | 'polynomial'
  | 'polynomial1'
  | 'polynomial2'
  | 'polynomial3'
  | 'projective'
  | 'thinPlateSpline'

export type TransformOptions = {
  maxOffsetRatio: number
  maxDepth: number
  // Assume source points are in lon/lat coordinates and use geographic distances and midpoints there
  sourceIsGeographic: boolean
  // Assume destination points are in lon/lat coordinates and use geographic distances and midpoints there
  destinationIsGeographic: boolean
  // Whether one of the axes should be flipped while computing the transformation parameters.
  inputIsMultiGeometry: boolean
  differentHandedness: boolean
  evaluationType: EvaluationType
}

export type KernelFunction = (
  r: number,
  options: KernelFunctionOptions
) => number
export type KernelFunctionOptions = { derivative?: number; epsilon?: number }
export type NormFunction = (point0: Point, point1: Point) => number

export type EvaluationType =
  | 'function'
  | 'partialDerivativeX'
  | 'partialDerivativeY'

export type DistortionMeasure =
  | 'log2sigma'
  | 'twoOmega'
  | 'airyKavr'
  | 'signDetJ'
  | 'thetaa'
