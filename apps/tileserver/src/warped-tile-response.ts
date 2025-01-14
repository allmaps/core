import { png } from 'itty-router'
import { decode as decodeJpeg, type UintArrRet } from 'jpeg-js'
import { encode as encodePng } from 'upng-js'

import { IntArrayRenderer, Viewport } from '@allmaps/render/int-array'

import { xyzTileToProjectedGeoBbox } from './geo.js'
import { cachedFetch } from './fetch.js'
import { getTileSize } from './tile-size.js'

import type { Size, Bbox, FetchFn } from '@allmaps/types'
import type { Map as GeoreferencedMap } from '@allmaps/annotation'
import type { XYZTile, TransformationOptions, TileResolution } from './types.js'

function getImageData(input: Uint8ClampedArray) {
  return decodeJpeg(input, { useTArray: true })
}

function getImageDataValue(decodedJpeg: UintArrRet, index: number) {
  return decodedJpeg.data[index]
}

function getImageDataSize(decodedJpeg: UintArrRet): Size {
  return [decodedJpeg.width, decodedJpeg.height]
}

export async function createWarpedTileResponse(
  georeferencedMaps: GeoreferencedMap[],
  options: TransformationOptions,
  { x, y, z }: XYZTile,
  resolution: TileResolution = 'normal'
): Promise<Response> {
  if (!(x >= 0 && y >= 0 && z >= 0)) {
    throw new Error('x, y and z must be positive integers')
  }

  // TODO: simplify this when TilejsonOptions will be aligned with TransformationOptions from @allmaps/render
  let transformationOptions
  if (options['transformation.type']) {
    transformationOptions = {
      type: options['transformation.type']
    }
  }

  const renderer = new IntArrayRenderer<UintArrRet>(
    getImageData,
    getImageDataValue,
    getImageDataSize,
    {
      fetchFn: cachedFetch as FetchFn,
      transformation: transformationOptions,
      createRTree: false
    }
  )

  for (const georeferencedMap of georeferencedMaps) {
    await renderer.addGeoreferencedMap(georeferencedMap)
  }

  const projectedGeoBbox: Bbox = xyzTileToProjectedGeoBbox({ x, y, z })

  const tileSize = getTileSize(resolution)

  const viewport = Viewport.fromProjectedGeoBbox(tileSize, projectedGeoBbox)

  const warpedTile = await renderer.render(viewport)

  const pngBuffer = encodePng([warpedTile.buffer], tileSize[0], tileSize[1], 0)
  return png(pngBuffer)
}
