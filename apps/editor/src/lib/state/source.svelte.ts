import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { fetchJson } from '@allmaps/stdlib'
import { IIIF } from '@allmaps/iiif-parser'
import { generateId } from '@allmaps/id'

import { UrlState } from '$lib/state/url.svelte'
import { ErrorState } from '$lib/state/error.svelte'

import { getImages } from '$lib/shared/iiif.js'

import type {
  Image as IIIFImage,
  EmbeddedImage as EmbeddedIIIFImage,
  Canvas as IIIFCanvas,
  Collection as IIIFCollection
} from '@allmaps/iiif-parser'

import type { Source, SourceType } from '$lib/shared/types.js'

const SOURCE_KEY = Symbol('source')

export class SourceState {
  #urlState: UrlState
  #errorState: ErrorState

  #source = $state<Source>()
  // #items = $state<(IIIFCollection | IIIFManifest | IIIFImage)[]>([])

  #loading = $state(false)

  #images = $state<(IIIFImage | EmbeddedIIIFImage)[]>([])
  #canvasesByImageId = $state<SvelteMap<string, IIIFCanvas>>(new SvelteMap())
  #imagesAllmapsIds = $state<SvelteMap<string, string>>(new SvelteMap())

  constructor(urlState: UrlState, errorState: ErrorState) {
    this.#urlState = urlState
    this.#errorState = errorState

    $effect(() => {
      const url = urlState.urlParam

      if (url) {
        this.#load(url)
      } else {
        this.#reset()
      }
    })
  }

  async #fetchCollectionManifestsAndAddImages(parsedIiif: IIIFCollection) {
    for await (const next of parsedIiif.fetchNext({
      fetchCollections: true,
      fetchManifests: true,
      fetchImages: false
    })) {
      if (next.item.type === 'manifest') {
        for (const canvas of next.item.canvases) {
          this.#images.push(canvas.image)
          this.#canvasesByImageId.set(canvas.image.uri, canvas)
          this.#imagesAllmapsIds.set(
            canvas.image.uri,
            await generateId(canvas.image.uri)
          )
        }
      }
    }
  }

  async #load(url: string) {
    try {
      const sourceIiif = await fetchJson(url)
      const parsedIiif = IIIF.parse(sourceIiif)

      let sourceType: SourceType

      if (parsedIiif.type === 'collection') {
        sourceType = 'collection'
        await this.#fetchCollectionManifestsAndAddImages(parsedIiif)
      } else if (parsedIiif.type === 'manifest') {
        sourceType = 'manifest'
        for (const canvas of parsedIiif.canvases) {
          this.#images.push(canvas.image)
          this.#canvasesByImageId.set(canvas.image.uri, canvas)
          this.#imagesAllmapsIds.set(
            canvas.image.uri,
            await generateId(canvas.image.uri)
          )
        }
      } else if (parsedIiif.type === 'image') {
        sourceType = 'image'
        this.#images.push(parsedIiif)
        this.#imagesAllmapsIds.set(
          parsedIiif.uri,
          await generateId(parsedIiif.uri)
        )
      } else {
        throw new Error('Unknown IIIF type')
      }

      const source: Source = {
        url,
        allmapsId: await generateId(parsedIiif.uri),
        type: sourceType,
        sourceIiif,
        parsedIiif
      }

      this.#source = source
    } catch (err) {
      this.#errorState.error = err
      this.#reset()
    } finally {
      this.#loading = false
    }
  }

  #isImageIdValid(imageId: string | null) {
    if (imageId) {
      const index = this.images.findIndex((image) => image.uri === imageId)

      return index > -1
    }

    return false
  }

  #reset() {
    this.#loading = false
    this.#source = undefined
    this.#images = []
    this.#canvasesByImageId = new SvelteMap()
    this.#imagesAllmapsIds = new SvelteMap()
  }

  get source() {
    return this.#source
  }

  get url() {
    return this.#source?.url
  }

  get images() {
    return this.#images
  }

  get loading() {
    return this.#loading
  }

  get label() {
    if (
      this.#source &&
      this.#source.parsedIiif &&
      'label' in this.#source.parsedIiif
    ) {
      return this.#source.parsedIiif.label
    }
  }

  get activeImageId() {
    if (this.#isImageIdValid(this.#urlState.imageIdParam)) {
      return this.#urlState.imageIdParam
    }

    return this.#images[0]?.uri
  }

  get activeImageIndex(): number | undefined {
    const index = this.images.findIndex(
      (image) => image.uri === this.activeImageId
    )

    return index > -1 ? index : undefined
  }

  get activeImage() {
    return this.images.find((image) => image.uri === this.activeImageId)
  }

  get activeCanvas() {
    if (this.activeImageId) {
      return this.#canvasesByImageId.get(this.activeImageId)
    }
  }

  get activeImageAllmapsId() {
    if (this.activeImageId) {
      return this.#imagesAllmapsIds.get(this.activeImageId)
    }
  }

  getPreviousActiveImageId() {
    const activeImageIndex = this.images.findIndex(
      (image) => image.uri === this.activeImageId
    )
    const previousImage =
      this.images[
        (activeImageIndex - 1 + this.images.length) % this.images.length
      ]

    return previousImage.uri
  }

  getNextActiveImageId() {
    const activeImageIndex = this.images.findIndex(
      (image) => image.uri === this.activeImageId
    )
    const nextImage = this.images[(activeImageIndex + 1) % this.images.length]

    return nextImage.uri
  }

  getCanvasByImageId(imageId: string) {
    return this.#canvasesByImageId.get(imageId)
  }

  // getImageById(id: string) {
  //   return this.#imagesById.get(id)
  // }

  // async fetchImageById(imageId: string) {
  //   // TODO: check if imageId is in images

  //   if (this.#imagesById.has(imageId)) {
  //     return this.#imagesById.get(imageId)
  //   } else {
  //     const imageInfo = await fetchImageInfo(imageId)
  //     const parsedIiif = IIIFImage.parse(imageInfo)

  //     const sourceImage: SourceImage = {
  //       url: `${imageId}/info.json`,
  //       allmapsId: await generateId(parsedIiif.uri),
  //       sourceIiif: imageInfo,
  //       parsedIiif
  //     }

  //     this.#imagesById.set(imageId, sourceImage)

  //     return sourceImage
  //   }
  // }
}

export function setSourceState(urlState: UrlState, errorState: ErrorState) {
  return setContext(SOURCE_KEY, new SourceState(urlState, errorState))
}

export function getSourceState() {
  const sourceState = getContext<ReturnType<typeof setSourceState>>(SOURCE_KEY)

  if (!sourceState) {
    throw new Error('SourceState is not set')
  }

  return sourceState
}
