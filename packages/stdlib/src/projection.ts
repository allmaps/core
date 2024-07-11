import { degreesToRadians } from './geometry.js'

import type { Point } from '@allmaps/types'

// From: https://gis.stackexchange.com/questions/156035/calculating-mercator-coordinates-from-lat-lon
export function lonLatToWebMecator([lon, lat]: Point): Point {
  const rMajor = 6378137.0
  const x = rMajor * degreesToRadians(lon)
  const y =
    rMajor * Math.log(Math.tan(Math.PI / 4.0 + (lat * (Math.PI / 180.0)) / 2.0))

  return [x, y]
}

// From: https://gist.github.com/mudpuddle/6115083
export function webMercatorToLonLat([x, y]: Point): Point {
  const rMajor = 6378137.0
  const shift = Math.PI * rMajor
  const lon = (x / shift) * 180.0
  let lat = (y / shift) * 180.0
  lat =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((lat * Math.PI) / 180.0)) - Math.PI / 2.0)

  return [lon, lat]
}
