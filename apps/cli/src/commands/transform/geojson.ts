import { Command } from 'commander'

import { Transformer } from '@allmaps/transform'

import { parseJsonFromFile, parseJsonInput, print } from '../../lib/io.js'
import { parseAnnotationValidateMap } from '../../lib/parse.js'
import {
  addAnnotationOption,
  addTransformOptions,
  parseTransformOptions
} from '../../lib/options.js'
import { createSvgString, transformGeoJsonToSvg } from '../../lib/svg.js'
import { isGeoJSONGeometry } from '../../lib/geojson.js'

export default function geojson() {
  let command = new Command('geojson')
    .argument('[files...]')
    .summary('transform GeoJSON to SVG')
    .description('Transforms GeoJSON to SVG using a Georeference Annotation')

  command = addAnnotationOption(command)

  return addTransformOptions(command).action(async (files, options) => {
    const annotation = parseJsonFromFile(options.annotation as string)
    const mapOrMaps = parseAnnotationValidateMap(annotation)

    if (Array.isArray(mapOrMaps) && mapOrMaps.length > 1) {
      throw new Error('Annotation must contain exactly 1 georeferenced map')
    }

    const transformOptions = parseTransformOptions(options)

    const map = Array.isArray(mapOrMaps) ? mapOrMaps[0] : mapOrMaps
    const transformer = new Transformer(map.gcps)

    const geoJsonGeometries = await parseJsonInput(files as string[])

    let svgElements = []
    for (let geoJsonGeometry of geoJsonGeometries) {
      if (isGeoJSONGeometry(geoJsonGeometry)) {
        const svgElement = transformGeoJsonToSvg(
          transformer,
          geoJsonGeometry,
          transformOptions
        )
        svgElements.push(svgElement)
      } else {
        throw new Error(
          'Unsupported input. Only GeoJSON Points, LineStrings and Polygons are supported.'
        )
      }
    }

    const svg = createSvgString(svgElements)
    print(svg)
  })
}
