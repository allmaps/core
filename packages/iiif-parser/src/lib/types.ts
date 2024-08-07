import { z } from 'zod'
import { TilesetSchema } from '../schemas/shared.js'

export type { Fit } from '@allmaps/types'

export type Tileset = z.infer<typeof TilesetSchema>

export type MajorVersion = 1 | 2 | 3

export type ProfileProperties = {
  supportsAnyRegionAndSize: boolean
  maxWidth?: number
  maxHeight?: number
  maxArea?: number
}

export type LanguageString = {
  [language: string]: string[]
}

export type MetadataItem = {
  label: LanguageString
  value: LanguageString
}

export type Metadata = MetadataItem[]

export type FetchNextOptions = {
  maxDepth?: number
  fetchCollections?: boolean
  fetchManifests?: boolean
  fetchImages?: boolean
  fetchFn: typeof fetch
}

export type FetchNextResults<Item> = {
  item: Item
  depth: number
  parent: {
    uri: string
    type: string
  }
}
