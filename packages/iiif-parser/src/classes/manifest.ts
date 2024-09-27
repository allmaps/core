import { z } from 'zod'

import {
  Manifest2Schema,
  Manifest3Schema,
  ManifestSchema
} from '../schemas/iiif.js'

import { EmbeddedManifest2Schema } from '../schemas/presentation.2.js'
import { EmbeddedManifest3Schema } from '../schemas/presentation.3.js'

import { Image, EmbeddedImage } from './image.js'
import { Canvas } from './canvas.js'

import {
  parseVersion2String,
  parseVersion3String,
  parseVersion2Metadata,
  filterInvalidMetadata
} from '../lib/strings.js'

import type {
  LanguageString,
  Metadata,
  MajorVersion,
  FetchNextResults
} from '../lib/types.js'

type ManifestType = z.infer<typeof ManifestSchema>
type EmbeddedManifestType =
  | z.infer<typeof EmbeddedManifest2Schema>
  | z.infer<typeof EmbeddedManifest3Schema>

const ManifestTypeString = 'manifest'

/**
 * Parsed IIIF Manifest, embedded in a Collection
 * @class EmbeddedManifest
 * @property {boolean} embedded - Whether the Manifest is embedded in a Collection
 * @property {string} [uri] - URI of Manifest
 * @property {LanguageString} [label] - Label of Manifest
 * @property {MajorVersion} [majorVersion] - IIIF API version of Manifest
 * @property {string} [type] - Resource type, equals 'manifest'
 */
export class EmbeddedManifest {
  readonly embedded: boolean = true

  uri: string
  type: typeof ManifestTypeString = ManifestTypeString

  label?: LanguageString

  majorVersion: MajorVersion

  constructor(parsedManifest: ManifestType | EmbeddedManifestType) {
    if ('@type' in parsedManifest) {
      // IIIF Presentation API 2.0
      this.uri = parsedManifest['@id']
      this.majorVersion = 2

      if (parsedManifest.label) {
        this.label = parseVersion2String(parsedManifest.label)
      }
    } else if ('type' in parsedManifest) {
      // IIIF Presentation API 3.0
      this.uri = parsedManifest.id
      this.majorVersion = 3

      this.label = parseVersion3String(parsedManifest.label)
    } else {
      throw new Error('Unsupported Manifest')
    }
  }
}

/**
 * Parsed IIIF Manifest
 * @class Manifest
 * @extends EmbeddedManifest
 * @property {Canvas[]} canvases - Array of parsed canvases
 * @property {LanguageString} [description] - Description of Manifest
 * @property {Metadata} [metadata] - Metadata of Manifest
 */
export class Manifest extends EmbeddedManifest {
  canvases: Canvas[] = []

  description?: LanguageString
  metadata?: Metadata

  readonly embedded = false

  constructor(parsedManifest: ManifestType) {
    super(parsedManifest)

    if ('@type' in parsedManifest) {
      // IIIF Presentation API 2.0
      if (parsedManifest.description) {
        this.description = parseVersion2String(parsedManifest.description)
      }

      this.metadata = filterInvalidMetadata(
        parseVersion2Metadata(parsedManifest.metadata)
      )

      const sequence = parsedManifest.sequences[0]
      this.canvases = sequence.canvases.map((canvas) => new Canvas(canvas))
    } else if ('type' in parsedManifest) {
      // IIIF Presentation API 3.0
      this.metadata = filterInvalidMetadata(parsedManifest.metadata)

      this.canvases = parsedManifest.items.map((canvas) => new Canvas(canvas))
    } else {
      throw new Error('Unsupported Manifest')
    }
  }

  /**
   * Parses a IIIF resource and returns a [Manifest](#manifest) containing the parsed version
   * @param {any} iiifManifest - Source data of IIIF Manifest
   * @param {MajorVersion} [majorVersion=null] - IIIF API version of Manifest. If not provided, it will be determined automatically
   * @returns {Manifest} Parsed IIIF Manifest
   * @static
   */
  static parse(
    iiifManifest: unknown,
    majorVersion: MajorVersion | null = null
  ) {
    let parsedManifest

    if (majorVersion === 2) {
      parsedManifest = Manifest2Schema.parse(iiifManifest)
    } else if (majorVersion === 3) {
      parsedManifest = Manifest3Schema.parse(iiifManifest)
    } else {
      parsedManifest = ManifestSchema.parse(iiifManifest)
    }

    return new Manifest(parsedManifest)
  }

  get images() {
    return this.canvases.map((canvas) => canvas.image)
  }

  async #fetchImage(
    image: Image | EmbeddedImage,
    fetchFn: typeof fetch
  ): Promise<Image> {
    if (image instanceof EmbeddedImage) {
      const url = `${image.uri}/info.json`

      const iiifImage = await fetchFn(url).then((response) => response.json())
      const fetchedImage = Image.parse(iiifImage)
      return fetchedImage
    } else {
      return image
    }
  }

  async fetchAll(
    fetchFn: typeof fetch = globalThis.fetch
  ): Promise<FetchNextResults<Image>[]> {
    const results: FetchNextResults<Image>[] = []

    for await (const next of this.fetchNext(fetchFn)) {
      results.push(next)
    }

    return results
  }

  async *fetchNext(
    fetchFn: typeof fetch = globalThis.fetch,
    depth = 0
  ): AsyncGenerator<FetchNextResults<Image>, void, void> {
    for (const canvas of this.canvases) {
      const fetchedImage = await this.#fetchImage(canvas.image, fetchFn)
      canvas.image = fetchedImage

      yield {
        item: fetchedImage,
        depth,
        parent: {
          uri: this.uri,
          type: this.type
        }
      }
    }
  }

  // TODO: implement fetchByUri function, also for collections
  async fetchImageByUri(
    imageUri: string,
    fetchFn: typeof fetch = globalThis.fetch
  ) {
    for (const canvas of this.canvases) {
      if (canvas.image.uri === imageUri) {
        const fetchedImage = await this.#fetchImage(canvas.image, fetchFn)
        canvas.image = fetchedImage
        return fetchedImage
      }
    }
  }
}
