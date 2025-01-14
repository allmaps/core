import { Command } from 'commander'

import { parseJsonInput, printString } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'

export default function imageId() {
  return new Command('image-ids')
    .argument('[files...]')
    .summary('read all IIIF Image IDs from a Georeference Annotation')
    .description('Reads all IIIF image ID from a Georeference Annotation')
    .action(async (files) => {
      const jsonValues = await parseJsonInput(files as string[])

      const maps = parseAnnotationsValidateMaps(jsonValues)
      const imageIds = new Set(maps.map((map) => map.resource.id))

      printString([...imageIds].join('\n'))
    })
}
