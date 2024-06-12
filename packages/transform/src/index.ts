import GcpTransformer from './transformer.js'

import Transformation from './transformation.js'

import Helmert from './transformation-types/helmert.js'
import Polynomial from './transformation-types/polynomial.js'
import Projective from './transformation-types/projective.js'
import RBF from './transformation-types/radial-basis-function.js'
import Straight from './transformation-types/straight.js'

import {
  supportedDistortionMeasures,
  computeDistortionFromPartialDerivatives
} from './distortion.js'

import { defaultTransformOptions } from './shared/transform-helper-functions.js'
import { defaultRefinementOptions } from './shared/refinement-helper-functions.js'

/** @module allmaps/transform */

// TODO: consider only exporting GCPTransformer
export {
  GcpTransformer,
  Transformation,
  Helmert,
  Polynomial,
  Projective,
  RBF,
  Straight,
  supportedDistortionMeasures,
  computeDistortionFromPartialDerivatives,
  defaultTransformOptions,
  defaultRefinementOptions
}

export * from './shared/types.js'
