export function roundWithDecimals(num: number, decimals = 2) {
  const pow = 10 ** decimals
  return Math.round((num + Number.EPSILON) * pow) / pow
}
