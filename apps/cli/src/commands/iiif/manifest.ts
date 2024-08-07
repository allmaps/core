import { Command } from 'commander'

import { IIIF, Image, Manifest } from '@allmaps/iiif-parser'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { generateManifest } from '../../lib/iiif.js'

// Instead of supplying input files, you can also use the standard input

export default function manifest() {
  return (
    new Command('manifest')
      .argument('[files...]')
      .summary('generate IIIF Manifest')
      .description(
        'Generates IIIF Manifest from other IIIF Manifests, IIIF Image Information and Georeference Annotations'
      )
      // TODO: add version option to allow choosing between IIIF Presentation API 2.1 and 3.0
      .option('-i, --id <id>', 'Manifest ID', 'https://example.org/manifest')
      .action(async (files, options) => {
        const jsonValues = await parseJsonInput(files as string[])

        const parsedImages = []
        const parsedIiif = jsonValues.map((jsonValue) => IIIF.parse(jsonValue))
        for (const p of parsedIiif) {
          if (p instanceof Image) {
            parsedImages.push(p)
          } else if (p instanceof Manifest) {
            parsedImages.push(...p.canvases.map((c) => c.image))
          } else {
            throw new Error('IIIF Collections not yet supported')
          }
        }
        const manifest = generateManifest(options.id as string, parsedImages)
        printJson(manifest)
      })
  )
}
