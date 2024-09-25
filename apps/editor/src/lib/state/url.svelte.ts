import { setContext, getContext } from 'svelte'
import { SvelteURL } from 'svelte/reactivity'

const URL_KEY = Symbol('url')

const INITIAL_URL = 'https://allmaps.org'

export class UrlState {
  #url = new SvelteURL(INITIAL_URL)

  #urlParam = $derived(this.#url.searchParams.get('url'))
  #imageIdParam = $derived(this.#url.searchParams.get('image'))

  constructor(url: URL) {
    this.#url = new SvelteURL(url)
  }

  updateUrl(url: URL) {
    this.#url.href = url.href
  }

  get urlParam() {
    return this.#urlParam
  }

  get imageIdParam() {
    return this.#imageIdParam
  }
}

export function setUrlState(url: URL) {
  return setContext(URL_KEY, new UrlState(url))
}

export function getUrlState() {
  const urlState = getContext<ReturnType<typeof setUrlState>>(URL_KEY)

  if (!urlState) {
    throw new Error('UrlState is not set')
  }

  return urlState
}
