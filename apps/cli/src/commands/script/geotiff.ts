import { Command, Option } from 'commander'

import fs from 'fs'
import path from 'path'

import { GcpTransformer } from '@allmaps/transform'
import { generateId } from '@allmaps/id'

import { addTransformOptions } from '../../lib/options.js'
import { parseJsonInput, printString } from '../../lib/io.js'
import {
  parseAnnotationsValidateMaps,
  parseTransformOptions
} from '../../lib/parse.js'
import { getMapId } from '../../lib/map.js'
import {
  preamble,
  checkImageExistsAndCorrectSize,
  gdalwarp,
  gdalbuildvrt
} from '../../lib/gdal.js'

export default function generate() {
  let command = new Command('geotiff')
    .argument('[files...]')
    .summary('generate a Bash script to create a Cloud Optimized GeoTIFF')
    .description(
      'Generates a Bash script that runs GDAL to create a Cloud Optimized GeoTIFF from one of more Georeference Annotations'
    )
    .option('-s, --source-dir <dir>', 'Directory containing source images', '.')
    .option('-d, --output-dir <dir>', 'Output directory', '.')
    .option('-c, --crs <string>', 'Coordinate reference system', 'EPSG:3857')
    .addOption(
      new Option(
        '-i, --image-filenames-file <filename>',
        'Path to a JSON file containing filenames of images to be used. See https://github.com/allmaps/allmaps/tree/develop/apps/cli#specifying-image-filenames for details'
      ).conflicts('source-dir')
    )
  command = addTransformOptions(command)

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files as string[])
    const maps = parseAnnotationsValidateMaps(jsonValues)
    const transformOptions = parseTransformOptions(options)

    const basenames: string[] = []
    const gdalwarpScripts: string[] = []

    let imageFilenames: { [key: string]: string } = {}

    if (options.imageFilenamesFile) {
      imageFilenames = JSON.parse(
        fs.readFileSync(options.imageFilenamesFile, 'utf-8')
      )
    }

    for (const map of maps) {
      const basename = await getMapId(map)

      let imageFilename: string
      if (
        map.resource.id in imageFilenames &&
        typeof imageFilenames[map.resource.id] === 'string'
      ) {
        imageFilename = imageFilenames[map.resource.id]
      } else {
        const imageId = await generateId(map.resource.id)
        imageFilename = path.join(options.sourceDir, `${imageId}.jpg`)
      }

      const transformer = new GcpTransformer(map.gcps, map.transformation?.type)
      const polygon = transformer.transformForwardAsGeojson(
        [map.resourceMask],
        transformOptions
      )

      const gdalwarpScript = gdalwarp(
        imageFilename,
        basename,
        options.outputDir,
        map,
        polygon
      )

      gdalwarpScripts.push(
        checkImageExistsAndCorrectSize(imageFilename, basename, map),
        gdalwarpScript
      )

      basenames.push(basename)
    }

    const outputVrt =
      basenames.length > 1 ? 'merged.vrt' : `${basenames[0]}.vrt`

    const inputTiffs = basenames.map((basename) => `${basename}-warped.tif`)
    const gdalbuildvrtScript = gdalbuildvrt(
      options.outputDir,
      inputTiffs,
      outputVrt
    )

    const gdalScripts = [
      preamble(options.outputDir),
      '',
      ...gdalwarpScripts,
      '',
      gdalbuildvrtScript
    ]

    printString(gdalScripts.join('\n'))
  })
}
