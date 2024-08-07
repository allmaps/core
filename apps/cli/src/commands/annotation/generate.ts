import { Command } from 'commander'

import { generateAnnotation } from '@allmaps/annotation'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'

export default function generate() {
  return new Command('generate')
    .argument('[files...]')
    .summary('generate Georeference Annotation')
    .description('Generate a single Georeference Annotation from input files')
    .action(async (files) => {
      const jsonValues = await parseJsonInput(files as string[])
      const maps = parseAnnotationsValidateMaps(jsonValues)

      let annotation: unknown
      if (maps.length === 1) {
        annotation = generateAnnotation(maps[0])
      } else {
        annotation = generateAnnotation(maps)
      }

      printJson(annotation)
    })
}
