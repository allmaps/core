import { Command } from 'commander'

import { parseJsonInput, printString } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'

export default function imageId() {
  return new Command('image-id')
    .argument('[files...]')
    .summary('read IIIF image ID from Georeference Annotation')
    .description('Reads IIIF image ID from Georeference Annotation')
    .action(async (files) => {
      const jsonValues = await parseJsonInput(files as string[])

      const maps = parseAnnotationsValidateMaps(jsonValues)
      printString(maps.map((map) => map.resource.id).join('\n'))
    })
}
