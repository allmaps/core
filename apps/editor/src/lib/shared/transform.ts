import { GcpTransformer } from '@allmaps/transform'

import { getCompleteGcps, getResourceMask } from '$lib/shared/maps.js'

import type { DbMap } from '$lib/shared/types.js'

export function transformResourceMaskToGeo(map: DbMap) {
  const gcps = getCompleteGcps(map)
  const resourceMask = getResourceMask(map)
  // TODO: add transformation to DbMap
  // - create DbMap3
  const transformer = new GcpTransformer(gcps)

  return transformer.transformToGeo(resourceMask)
}
