import { generateId, generateRandomId } from '@allmaps/id'

import type { Map as GeoreferencedMap } from '@allmaps/annotation'
import type {
  Image as IIIFImage,
  EmbeddedImage as EmbeddedIIIFImage
} from '@allmaps/iiif-parser'

import type {
  DbMap1,
  DbMap2,
  DbMap,
  DbMaps,
  DbGcps,
  DbGcps2,
  DbGcp1,
  DbGcp2,
  DbGcp,
  ResourceMask,
  Point,
  GCP
} from '$lib/shared/types.js'

import { PUBLIC_ALLMAPS_ANNOTATIONS_API_URL } from '$env/static/public'

export function isDbMap1(dbMap: DbMap): dbMap is DbMap1 {
  return dbMap.version === 1
}

export function isDbMap2(dbMap: DbMap): dbMap is DbMap2 {
  return dbMap.version === 2
}

export function isDbGcp1(dbGcp: DbGcp): dbGcp is DbGcp1 {
  return 'image' in dbGcp
}

export function isDbGcp2(dbGcp: DbGcp): dbGcp is DbGcp2 {
  return 'resource' in dbGcp
}

export function getResourceMask(dbMap: DbMap): ResourceMask {
  if (isDbMap1(dbMap)) {
    return dbMap.pixelMask
  } else {
    return dbMap.resourceMask
  }
}

export function getGcps(dbMap: DbMap): DbGcp2[] {
  const gcps = toDbGcps2(dbMap.gcps)
  return Object.values(gcps)
}

export function getCompleteGcps(dbMap: DbMap): GCP[] {
  const gcps = toDbGcps2(dbMap.gcps)
  return Object.values(gcps).filter(isGcpComplete)
}

export function getGcpResourcePoint(dbGcp: DbGcp) {
  if (isDbGcp1(dbGcp)) {
    return dbGcp.image
  } else {
    return dbGcp.resource
  }
}

export function getGcpGeoPoint(dbGcp: DbGcp) {
  if (isDbGcp1(dbGcp)) {
    return dbGcp.world
  } else {
    return dbGcp.geo
  }
}

export async function createMapWithFullImageResourceMask(
  image: IIIFImage | EmbeddedIIIFImage
) {
  const mapId = await generateRandomId()
  const imageAllmapsId = await generateId(image.uri)

  const resourceMask = [
    [0, 0],
    [0, image.height],
    [image.width, image.height],
    [image.width, 0]
  ] as Point[]

  return {
    id: mapId,
    version: 2 as const,
    resource: {
      id: imageAllmapsId,
      uri: image.uri,
      width: image.width,
      height: image.height,
      type:
        image.majorVersion === 2
          ? ('ImageService2' as const)
          : ('ImageService3' as const)
    },
    gcps: {},
    resourceMask
  }
}

export function toDbGcps2(gcps: DbGcps): DbGcps2 {
  return Object.values(gcps).reduce(
    (gcps, gcp: DbGcp) => ({
      ...gcps,
      [gcp.id]: {
        id: gcp.id,
        resource: getGcpResourcePoint(gcp),
        geo: getGcpGeoPoint(gcp)
      }
    }),
    {}
  )
}

export function toDbMap2(dbMap: DbMap): DbMap2 {
  if (isDbMap1(dbMap)) {
    return {
      id: dbMap.id,
      gcps: Object.values(dbMap.gcps).reduce(
        (gcps, { id, image, world }) => ({
          ...gcps,
          [id]: {
            id,
            resource: image,
            geo: world
          }
        }),
        {}
      ),
      resource: dbMap.image,
      resourceMask: dbMap.pixelMask,
      version: 2
    }
  }

  return dbMap
}

export function isGcpComplete(gcp: DbGcp2): gcp is GCP {
  return gcp.resource && gcp.geo ? true : false
}

export function fromDbMap(dbMap: DbMap): GeoreferencedMap {
  const dbMap2 = toDbMap2(dbMap)

  return {
    '@context': 'https://schemas.allmaps.org/map/2/context.json',
    type: 'GeoreferencedMap',
    id: `${PUBLIC_ALLMAPS_ANNOTATIONS_API_URL}/maps/${dbMap2.id}`,
    resource: {
      ...dbMap2.resource,
      id: dbMap2.resource.uri || dbMap2.resource.id
    },
    gcps: Object.values(dbMap2.gcps).filter(isGcpComplete),
    resourceMask: dbMap2.resourceMask
  }
}

export function fromDbMaps(dbMaps: DbMaps): GeoreferencedMap[] {
  return Object.values(dbMaps).map(fromDbMap)
}
