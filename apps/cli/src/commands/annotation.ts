import { Command } from 'commander'

import parse from './annotation/parse.js'
import generate from './annotation/generate.js'
import svg from './annotation/svg.js'

export default function annotation() {
  return new Command('annotation')
    .summary('parse and generate Georeference Annotations')
    .description(`Parses and generates Georeference Annotations`)
    .addCommand(parse())
    .addCommand(generate())
    .addCommand(svg())
}
