import { png } from 'itty-router'

import { decode as decodeJpeg, type UintArrRet } from 'jpeg-js'
import { encode as encodePng } from 'upng-js'

import { IntArrayRenderer, Viewport } from '@allmaps/render/int-array'

import { cachedFetch } from './fetch.js'

import type { TransformationOptions } from './types.js'

import type { Size, FetchFn } from '@allmaps/types'

function getImageData(input: Uint8ClampedArray) {
  return decodeJpeg(input, { useTArray: true })
}

function getImageDataValue(decodedJpeg: UintArrRet, index: number) {
  return decodedJpeg.data[index]
}

function getImageDataSize(decodedJpeg: UintArrRet): Size {
  return [decodedJpeg.width, decodedJpeg.height]
}

export async function generateImage(
  mapId: string,
  size: Size,
  options: TransformationOptions
) {
  const annotationUrl = `https://annotations.allmaps.org/maps/${mapId}`

  const annotation = await cachedFetch(annotationUrl).then((response) =>
    response.json()
  )

  // TODO: simplify this when this will be aligned with TransformationOptions from @allmaps/render
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
      createRTree: false,
      transformation: transformationOptions
    }
  )

  await renderer.addGeoreferenceAnnotation(annotation)

  const viewport = Viewport.fromSizeAndMaps(
    size,
    renderer.warpedMapList,
    undefined,
    'contain',
    0,
    1,
    1.25
  )
  const image = await renderer.render(viewport)
  const pngBuffer = encodePng([image.buffer], size[0], size[1], 0)

  return png(pngBuffer)
}
