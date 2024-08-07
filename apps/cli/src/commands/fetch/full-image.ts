import { Command } from 'commander'

import path from 'path'
import { createWriteStream } from 'fs'
import { Readable } from 'stream'

import { generateId } from '@allmaps/id'

import { readLines } from '../../lib/io.js'

export default function fullImage() {
  return new Command('full-image')
    .argument('[image IDs...]')
    .option('-d, --output-dir <dir>', 'Output directory', '.')
    .summary('fetches full-size IIIF image')
    .description('Fetches full-size IIIF image from an image ID')
    .action(async (imageIds, options) => {
      imageIds = await readLines(imageIds)

      for (const imageId of imageIds) {
        const fullImageUrl = `${imageId}/full/full/0/default.jpg`

        const imageFilename = path.join(
          options.outputDir,
          (await generateId(imageId)) + '.jpg'
        )

        console.log(`Downloading ${fullImageUrl}`)

        const response = await fetch(fullImageUrl)
        if (response.ok && response.body) {
          console.log('  Writing to file:', imageFilename)
          const writer = createWriteStream(imageFilename)

          // @ts-expect-error ignore ReaebleStream generics error
          Readable.fromWeb(response.body).pipe(writer)
        } else {
          throw new Error(`Failed to fetch ${fullImageUrl}`)
        }
      }
    })
}
