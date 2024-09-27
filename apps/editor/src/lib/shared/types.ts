import type {
  Image as IIIFImage,
  Manifest as IIIFManifest,
  Collection as IIIFCollection
} from '@allmaps/iiif-parser'
import type { TransformationType } from '@allmaps/transform'
import type { Map as GeoreferencedMap } from '@allmaps/annotation'

export type Params = {
  url: string | null
  image: string | null
  map: string | null
}

export type Point = [number, number]

export type RouteID = 'images' | 'mask' | 'georeference' | ''

export type Scope = 'images' | 'image' | 'map'

export type SourceType = 'image' | 'manifest' | 'collection'

type BaseSource = {
  url: string
  allmapsId: string
  sourceIiif: unknown
  type: SourceType
  parsedIiif: IIIFImage | IIIFManifest | IIIFCollection
}

type ImageSource = {
  type: 'image'
  parsedIiif: IIIFImage
}

type ManifestSource = {
  type: 'manifest'
  parsedIiif: IIIFManifest
}

type CollectionSource = {
  type: 'collection'
  parsedIiif: IIIFCollection
}

export type Source = BaseSource &
  (ImageSource | ManifestSource | CollectionSource)

export type DbImageService = 'ImageService1' | 'ImageService2' | 'ImageService3'

export type GCP = {
  id: string
  resource: Point
  geo: Point
}

export type ResourceMask = Point[]

export type GeoreferencedMapsByImageId = Record<string, GeoreferencedMap[]>

// ============================================================================
// Map version 1
// ============================================================================

export type DbGcp1 = {
  id: string
  image?: Point
  world?: Point
}

export type DbGcps1 = Record<string, DbGcp1>

export type DbResource1 = {
  id: string
  uri: string
  type: DbImageService
  width: number
  height: number
}

export type DbMap1 = {
  id: string
  gcps: DbGcps1
  image: DbResource1
  version: 1
  pixelMask: ResourceMask
}

export type DbMaps1 = Record<string, DbMap1>

// ============================================================================
// Map version 2
// ============================================================================

export type DbGcp2 = {
  id: string
  resource?: Point
  geo?: Point
}

export type DbGcps2 = Record<string, DbGcp2>

export type DbResource2 = {
  id: string
  uri: string
  type: DbImageService
  width: number
  height: number
}

export type DbMap2 = {
  id: string
  gcps: DbGcps2
  resource: DbResource2
  version: 2
  resourceMask: ResourceMask
}

// ============================================================================
// Map version 3
// ============================================================================

export type DbGcp3 = {
  id: string
  timestamp: number
  resource?: [number, number]
  geo?: [number, number]
}

export type DbGcps3 = Record<string, DbGcp3>

export type DbResource3 = DbResource2

export type DbMap3 = {
  id: string
  timestamp: number
  transformation?: TransformationType
  gcps: DbGcps3
  resource: DbResource3
  version: 3
  resourceMask: ResourceMask
}

export type DbMaps3 = Record<string, DbMap3>

// ============================================================================
// Union types
// ============================================================================

export type DbGcp = DbGcp1 | DbGcp2

export type DbGcps = DbGcps1 | DbGcps2

export type DbMaps2 = Record<string, DbMap2>

export type DbMap = DbMap1 | DbMap2

export type DbMaps = Record<string, DbMap1 | DbMap2>

// ============================================================================
// Events
// ============================================================================

export type InsertMap = {
  mapId: string
  map: DbMap2
}

export type RemoveMap = {
  mapId: string
}

export type InsertResourceMaskPoint = {
  mapId: string
  index: number
  point: Point
}

export type ReplaceResourceMaskPoint = {
  mapId: string
  index: number
  point: Point
}

export type RemoveResourceMaskPoint = {
  mapId: string
  index: number
}

export type InsertGcp = {
  mapId: string
  gcpId: string
  gcp: DbGcp2
}

export type ReplaceGcp = {
  mapId: string
  gcpId: string
  gcp: DbGcp2
}

export type RemoveGcp = {
  mapId: string
  gcpId: string
}

export type InsertMapEvent = CustomEvent<InsertMap>
export type RemoveMapEvent = CustomEvent<RemoveMap>

export type InsertResourceMaskPointEvent = CustomEvent<InsertResourceMaskPoint>
export type ReplaceResourceMaskPointEvent =
  CustomEvent<ReplaceResourceMaskPoint>
export type RemoveResourceMaskPointEvent = CustomEvent<RemoveResourceMaskPoint>

export type InsertGcpEvent = CustomEvent<InsertGcp>
export type ReplaceGcpEvent = CustomEvent<ReplaceGcp>
export type RemoveGcpEvent = CustomEvent<RemoveGcp>
