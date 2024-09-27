import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { fetchJson } from '@allmaps/stdlib'
import { IIIF } from '@allmaps/iiif-parser'
import { generateId } from '@allmaps/id'

import { UrlState } from '$lib/state/url.svelte'
import { ErrorState } from '$lib/state/error.svelte'

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

  #loading = $state(false)

  #imagesByImageId = $state<SvelteMap<string, IIIFImage | EmbeddedIIIFImage>>(
    new SvelteMap()
  )

  #imageCount = $derived(this.#imagesByImageId.size)

  #canvasesByImageId = $state<SvelteMap<string, IIIFCanvas>>(new SvelteMap())
  #allmapsIdsByImageId = $state<SvelteMap<string, string>>(new SvelteMap())

  constructor(urlState: UrlState, errorState: ErrorState) {
    this.#urlState = urlState
    this.#errorState = errorState

    $effect(() => {
      const url = urlState.urlParam

      this.#reset()

      if (url) {
        this.#load(url)
      }
    })
  }

  get imagesByImageId() {
    return this.#imagesByImageId
  }

  async fetchImageInfo(imageId: string) {
    if (this.#source?.type === 'manifest') {
      const canvas = this.getCanvasByImageId(imageId)
      const image = canvas?.image

      if (image?.embedded) {
        const fetchedImage =
          await this.#source.parsedIiif.fetchImageByUri(imageId)

        if (fetchedImage) {
          if (imageId === fetchedImage.uri) {
            this.#imagesByImageId.set(imageId, fetchedImage)
          } else {
            console.warn("Image IDs don't match:", imageId, fetchedImage.uri)

            this.#imagesByImageId.delete(imageId)
            this.#imagesByImageId.set(fetchedImage.uri, fetchedImage)
            // TODO: update #canvasesByImageId

            this.#allmapsIdsByImageId.set(
              fetchedImage.uri,
              await generateId(fetchedImage.uri)
            )
          }
        }
      }
    }
  }

  async #fetchCollectionManifestsAndAddImages(parsedIiif: IIIFCollection) {
    for await (const next of parsedIiif.fetchNext({
      fetchCollections: true,
      fetchManifests: true,
      fetchImages: false
    })) {
      if (next.item.type === 'manifest') {
        for (const canvas of next.item.canvases) {
          this.#imagesByImageId.set(canvas.image.uri, canvas.image)
          this.#canvasesByImageId.set(canvas.image.uri, canvas)
          this.#allmapsIdsByImageId.set(
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

      const baseSource = {
        url,
        allmapsId: await generateId(parsedIiif.uri),
        sourceIiif
      }

      let source: Source

      if (parsedIiif.type === 'collection') {
        sourceType = 'collection'
        await this.#fetchCollectionManifestsAndAddImages(parsedIiif)

        source = {
          ...baseSource,
          type: sourceType,
          parsedIiif
        }
      } else if (parsedIiif.type === 'manifest') {
        sourceType = 'manifest'
        for (const canvas of parsedIiif.canvases) {
          this.#imagesByImageId.set(canvas.image.uri, canvas.image)
          this.#canvasesByImageId.set(canvas.image.uri, canvas)
          this.#allmapsIdsByImageId.set(
            canvas.image.uri,
            await generateId(canvas.image.uri)
          )
        }

        source = {
          ...baseSource,
          type: sourceType,
          parsedIiif
        }
      } else if (parsedIiif.type === 'image') {
        sourceType = 'image'
        this.#imagesByImageId.set(parsedIiif.uri, parsedIiif)
        this.#allmapsIdsByImageId.set(
          parsedIiif.uri,
          await generateId(parsedIiif.uri)
        )

        source = {
          ...baseSource,
          type: sourceType,
          parsedIiif
        }
      } else {
        throw new Error('Unknown IIIF type')
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
    if (!imageId) {
      return false
    }

    return this.#imagesByImageId.has(imageId)
  }

  #reset() {
    this.#loading = false
    this.#source = undefined
    this.#imagesByImageId = new SvelteMap()
    this.#canvasesByImageId = new SvelteMap()
    this.#allmapsIdsByImageId = new SvelteMap()
  }

  get source() {
    return this.#source
  }

  get url() {
    return this.#source?.url
  }

  get images() {
    return this.#imagesByImageId.values()
  }

  get imageCount() {
    return this.#imageCount
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

    const imagesArray = [...this.images]
    const firstImage = imagesArray[0]

    if (firstImage) {
      return firstImage.uri
    }
  }

  get activeImageIndex(): number | undefined {
    const imagesArray = [...this.images]

    const index = imagesArray.findIndex(
      (image) => image.uri === this.activeImageId
    )

    return index > -1 ? index : undefined
  }

  get activeImage() {
    if (this.activeImageId) {
      return this.#imagesByImageId.get(this.activeImageId)
    }
  }

  get activeCanvas() {
    if (this.activeImageId) {
      return this.#canvasesByImageId.get(this.activeImageId)
    }
  }

  get activeImageAllmapsId() {
    if (this.activeImageId) {
      return this.#allmapsIdsByImageId.get(this.activeImageId)
    }
  }

  getPreviousActiveImageId() {
    const imagesArray = [...this.images]

    const activeImageIndex = imagesArray.findIndex(
      (image) => image.uri === this.activeImageId
    )

    if (activeImageIndex > -1) {
      const previousImage =
        imagesArray[
          (activeImageIndex - 1 + imagesArray.length) % imagesArray.length
        ]

      return previousImage.uri
    }
  }

  getNextActiveImageId() {
    const imagesArray = [...this.images]

    const activeImageIndex = imagesArray.findIndex(
      (image) => image.uri === this.activeImageId
    )

    if (activeImageIndex > -1) {
      const nextImage = imagesArray[(activeImageIndex + 1) % imagesArray.length]

      return nextImage.uri
    }
  }

  getCanvasByImageId(imageId: string) {
    return this.#canvasesByImageId.get(imageId)
  }
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
