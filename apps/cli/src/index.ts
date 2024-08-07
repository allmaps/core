#!/usr/bin/env node

import { Command, CommanderError } from 'commander'
import { fromZodError } from 'zod-validation-error'

import annotation from './commands/annotation.js'
import script from './commands/script.js'
import fetch from './commands/fetch.js'
import id from './commands/id.js'
import iiif from './commands/iiif.js'
import transform from './commands/transform.js'

import type { ZodError } from 'zod'

const fixedWidth = process.env.NODE_ENV === 'test'

const program = new Command()
  .name('allmaps')
  .exitOverride()
  .addCommand(annotation())
  .addCommand(transform())
  .addCommand(iiif())
  .addCommand(id())
  .addCommand(fetch())
  .addCommand(script())
  .configureHelp({
    helpWidth: fixedWidth ? 80 : undefined
  })
  .addHelpText('beforeAll', `Allmaps CLI\n`)
  .addHelpText(
    'afterAll',
    `\nFor more details about Allmaps, see https://allmaps.org`
  )

async function parse() {
  try {
    await program.parseAsync(process.argv)
  } catch (err: unknown) {
    if (err instanceof CommanderError) {
      // TODO: I probably don't completely understand how errors should be handled
      // Ignore these errors!
    } else if (err instanceof Error) {
      if ('code' in err && err.code === 'ENOENT' && 'path' in err) {
        console.error(`File not found "${err.path}"`)
      } else if (err.name === 'ZodError') {
        const validationError = fromZodError(err as ZodError)
        console.error(validationError.message)
      } else {
        console.error('Error:', err.message)
      }
    } else {
      console.error('Unkown error:', err)
    }
    process.exit(1)
  }
}

parse()
