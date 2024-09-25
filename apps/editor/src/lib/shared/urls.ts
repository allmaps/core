import type { SourceType } from './types.js'

type ExportType = SourceType | 'map'

export function getAnnotationUrl(type: ExportType, allmapsId: string) {
  return `https://annotations.allmaps.org/${type}s/${allmapsId}`
}

export function getViewerUrl(type: ExportType, allmapsId: string) {
  return `https://dev.viewer.allmaps.org/?url=${getAnnotationUrl(type, allmapsId)}`
}

export function getGeoJsonUrl(type: ExportType, allmapsId: string) {
  return `${getAnnotationUrl(type, allmapsId)}.geojson`
}

export function getXyzTilesUrl(type: ExportType, allmapsId: string) {
  return `https://allmaps.xyz/${type}s/${allmapsId}/{z}/{x}/{y}.png`
}
