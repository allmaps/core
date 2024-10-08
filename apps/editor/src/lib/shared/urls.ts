import type { SourceType } from './types.js'

import {
  PUBLIC_ALLMAPS_ANNOTATIONS_API_URL,
  PUBLIC_ALLMAPS_VIEWER_URL,
  PUBLIC_ALLMAPS_TILE_SERVER_URL
} from '$env/static/public'

type ExportType = SourceType | 'map'

export function getAnnotationUrl(type: ExportType, allmapsId: string) {
  return `${PUBLIC_ALLMAPS_ANNOTATIONS_API_URL}/${type}s/${allmapsId}`
}

export function getViewerUrl(type: ExportType, allmapsId: string) {
  return `${PUBLIC_ALLMAPS_VIEWER_URL}/?url=${getAnnotationUrl(type, allmapsId)}`
}

export function getGeoJsonUrl(type: ExportType, allmapsId: string) {
  return `${getAnnotationUrl(type, allmapsId)}.geojson`
}

export function getXyzTilesUrl(type: ExportType, allmapsId: string) {
  return `${PUBLIC_ALLMAPS_TILE_SERVER_URL}/${type}s/${allmapsId}/{z}/{x}/{y}.png`
}
