import { setContext, getContext } from 'svelte'

import { uniqBy } from 'lodash-es'

import { PUBLIC_EXAMPLES_API_URL } from '$env/static/public'

type Example = {
  title: string
  manifestId: string
  imageId: string
}

const EXAMPLES_KEY = Symbol('maps-history')

const count = 750

export class ExamplesState {
  #examples = $state<Example[]>([])
  #loading = $derived(this.#examples.length === 0)
  #page = $state(1)

  constructor() {
    $effect(() => {
      this.fetchExamples()
    })
  }

  async fetchExamples() {
    const fetchedExamples = (await fetch(
      `${PUBLIC_EXAMPLES_API_URL}/?count=${count}`
    ).then((response) => response.json())) as Example[]
    this.#examples = uniqBy(fetchedExamples, (example) => example.imageId)
  }

  get examples() {
    return this.#examples
  }

  get loading() {
    return this.#loading
  }

  get page() {
    return this.#page
  }

  set page(page: number) {
    this.#page = page
  }
}

export function setExamplesState() {
  return setContext(EXAMPLES_KEY, new ExamplesState())
}

export function getExamplesState() {
  const examplesState =
    getContext<ReturnType<typeof setExamplesState>>(EXAMPLES_KEY)

  if (!examplesState) {
    throw new Error('ExamplesState is not set')
  }

  return examplesState
}
