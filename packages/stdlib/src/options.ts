export function mergeOptions<Options>(
  options: Options,
  partialOptions?: Partial<Options>
): Options {
  // This function is a little expensive and is executed for every point in transform
  // so small speed-ups like this if statement make for a 50% speed increase when transforming a lot of points
  if (!partialOptions) {
    return options
  } else {
    return {
      ...options,
      ...partialOptions
    }
  }
}

export function mergePartialOptions<Options>(
  partialOptions0?: Partial<Options>,
  partialOptions1?: Partial<Options>
): Partial<Options> {
  if (!partialOptions0 && !partialOptions1) {
    return {}
  } else if (partialOptions0 && !partialOptions1) {
    return partialOptions0
  } else if (!partialOptions0 && partialOptions1) {
    return partialOptions1
  } else {
    return {
      ...partialOptions0,
      ...partialOptions1
    }
  }
}
