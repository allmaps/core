import type { Map as GeoreferencedMap } from '@allmaps/annotation'
import type { GeojsonPolygon } from '@allmaps/types'

type GdalOptions = {
  srs: string
  tr: number
  quality: number
}

const defaultOptions: Partial<GdalOptions> = {
  srs: 'EPSG:3857',
  quality: 75
}

const jqNotFoundMessage = 'Please install jq: https://jqlang.github.io/jq/.'
const gdalNotFoundMessage = 'Please install GDAL.'

export function preamble(outputDir: string) {
  return `#!/usr/bin/env bash

mkdir -p ${outputDir}

${checkCommand('gdalinfo', gdalNotFoundMessage)}
${checkCommand('gdalbuildvrt', gdalNotFoundMessage)}
${checkCommand('gdal_translate', gdalNotFoundMessage)}
${checkCommand('gdalwarp', gdalNotFoundMessage)}
${checkCommand('jq', jqNotFoundMessage)}`.trim()
}

export function checkCommand(command: string, message: string) {
  return `
if ! command -v ${command} &> /dev/null
then
    echo "Error: ${command} could not be found. ${message}"
    exit 1
fi`.trim()
}

export function checkImageExistsAndCorrectSize(
  imageFilename: string,
  basename: string,
  map: GeoreferencedMap
) {
  return `
if ! [ -f ${imageFilename} ]; then
  echo "Image file does not exist: ${imageFilename}"
  echo "This script expects a full-size source images for each georeferenced map it processes. See the README for more information."
  exit 1
fi

required_width_${basename}=${map.resource.width}
required_height_${basename}=${map.resource.height}

width_${basename}=( $(gdalinfo -json ${imageFilename} | jq '.size[0]') )
height_${basename}=( $(gdalinfo -json  ${imageFilename} | jq '.size[1]') )

if [ "$width_${basename}" -eq "$required_width_${basename}" ] &&
   [ "$height_${basename}" -eq "$required_height_${basename}" ]; then
    echo "Found image with correct size: ${imageFilename}"
else
    echo "Error: found image with incorrect size"
    echo "  Image: ${imageFilename}"
    echo "  Expected: $required_width_${basename} x $required_height_${basename}"
    echo "  Found: $width_${basename} x $height_${basename}"
    exit 1
fi`.trim()
}

// https://blog.cleverelephant.ca/2015/02/geotiff-compression-for-dummies.html

export function gdalwarp(
  imageFilename: string,
  basename: string,
  outputDir: string,
  map: GeoreferencedMap,
  geoMask: GeojsonPolygon,
  options?: Partial<GdalOptions>
) {
  options = { ...defaultOptions, ...options }

  // TODO: read transformation from map
  // See https://gdal.org/programs/gdalwarp.html#cmdoption-gdalwarp-tps

  return `
gdal_translate -of vrt \\
  -a_srs EPSG:4326 \\
  ${map.gcps
    .map((gcp) => `-gcp ${gcp.resource.join(' ')} ${gcp.geo.join(' ')}`)
    .join(' \\\n')} \\
  ${imageFilename} \\
  ${outputDir}/${basename}.vrt

echo '${JSON.stringify(geoMask)}' > ${outputDir}/${basename}.geojson

gdalwarp \\
  -of COG -co COMPRESS=JPEG -co QUALITY=${options.quality} \\
  -dstalpha -overwrite \\
  -cutline ${outputDir}/${basename}.geojson -crop_to_cutline \\
  -t_srs "${options.srs}" \\
  -order 1 \\
  ${outputDir}/${basename}.vrt \\
  ${outputDir}/${basename}-warped.tif`.trim()
}

export function gdalbuildvrt(
  outputDir: string,
  inputTiffs: string[],
  outputVrt: string
) {
  return `
gdalbuildvrt ${outputDir}/${outputVrt} \\
  ${inputTiffs.map((tiff) => `${outputDir}/${tiff}`).join(' ')}`.trim()
}

export function gdal2tiles(
  outputDir: string,
  outputTiff: string,
  layerId: string
) {
  return `
gdal2tiles.py --xyz ${outputDir}/${outputTiff} ${outputDir}/${layerId}`.trim()
}

// TODO: consider adding pmtiles export:
//    gdal_translate -of MBTILES merged.vrt merged.mbtiles
//    pmtiles convert merged.mbtiles merged.pmtiles
