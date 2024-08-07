// Image API 2.1.1
// https://iiif.io/api/image/2.1/#image-information

import { z } from 'zod'
import { TilesetSchema, SizeSchema } from './shared.js'

// The following compliance levels URIs are valid in the IIIF Image API 2.1:
//  - "http://iiif.io/api/image/2/level0.json"
//  - "http://iiif.io/api/image/2/level1.json"
//  - "http://iiif.io/api/image/2/level2.json"
//
// However, many IIIF servers use incorrect profile URIs, like these:
//  - "http://iiif.io/api/image/2/level0"
//  - "https://iiif.io/api/image/2/level0"
//  - "http://iiif.io/api/image/2/profiles/level0.json"
//
// This happens very often - @allmaps/iiif-parser should parse them regardless.
// To do this, we use this regular expression:
export const image2ProfileUriRegex =
  /^https?:\/\/iiif.io\/api\/image\/2.*level(?<level>[012])(.json)?$/

export const Image2ProfileUri = z.string().regex(image2ProfileUriRegex)

export const Image2ProfileDescriptionSchema = z.object({
  formats: z.string().array().optional(),
  maxArea: z.number().int().optional(),
  maxHeight: z.number().int().optional(),
  maxWidth: z.number().int().optional(),
  qualities: z.string().array().optional(),
  supports: z.string().array().optional()
})

export const Image2ProfileSchema = Image2ProfileUri.or(
  z.array(
    z.union([
      Image2ProfileUri,
      Image2ProfileDescriptionSchema,

      // Catchall for incorrect profiles
      z.any()
    ])
  )
)

export const Image2ContextString = 'http://iiif.io/api/image/2/context.json'
export const Image2Context = z
  .literal(Image2ContextString)
  // Invalid, bus used by https://iiif.archivelab.org
  .or(z.literal('https://iiif.io/api/image/2/context.json'))

export const Image2Schema = z.object({
  '@id': z.string().url(),
  '@type': z.literal('iiif:Image').or(z.literal('ImageService2')).optional(),
  '@context': Image2Context,
  protocol: z.literal('http://iiif.io/api/image'),
  width: z.number().int(),
  height: z.number().int(),
  profile: Image2ProfileSchema,
  sizes: SizeSchema.array().optional(),
  tiles: TilesetSchema.array().optional()
})
