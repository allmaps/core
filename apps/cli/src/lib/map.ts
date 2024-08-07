import { generateChecksum } from '@allmaps/id'

import type { Map as GeoreferencedMap } from '@allmaps/annotation'

export async function getMapId(map: GeoreferencedMap) {
  if (map.id) {
    const match = /maps\/(?<mapId>\w+)$/.exec(map.id)

    if (match) {
      const { groups: { mapId } = {} } = match
      return mapId
    }
  }

  const checksum = await generateChecksum(map)
  return checksum
}
