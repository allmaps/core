import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { fetchImageInfo } from '@allmaps/stdlib'

const IMAGE_INFO_KEY = Symbol('image-infos')

export class ImageInfoState {
  #imageInfoByImageId = $state<SvelteMap<string, unknown>>(new SvelteMap())

  async fetchImageInfo(imageId: string) {
    if (this.#imageInfoByImageId.has(imageId)) {
      return this.#imageInfoByImageId.get(imageId)
    }

    const imageInfo = await fetchImageInfo(imageId)
    this.#imageInfoByImageId.set(imageId, imageInfo)
    return imageInfo
  }
}

export function setImageInfoState() {
  return setContext(IMAGE_INFO_KEY, new ImageInfoState())
}

export function getImageInfoState() {
  const imageInfoState =
    getContext<ReturnType<typeof setImageInfoState>>(IMAGE_INFO_KEY)

  if (!imageInfoState) {
    throw new Error('ImageInfosState is not set')
  }

  return imageInfoState
}
