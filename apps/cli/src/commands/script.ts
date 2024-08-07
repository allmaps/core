import { Command } from 'commander'

import geotiff from './script/geotiff.js'

export default function script() {
  return new Command('script')
    .summary('generate Bash scripts')
    .description('Generates Bash scripts')
    .addCommand(geotiff())
}
