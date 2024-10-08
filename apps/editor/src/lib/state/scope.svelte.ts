import { setContext, getContext } from 'svelte'

import type { SourceState } from '$lib/state/source.svelte'
import type { Scope } from '$lib/shared/types.js'

const SCOPE_KEY = Symbol('scope')

export class ScopeState {
  #scope = $state<Scope>('image')

  #hasImagesScope = $state<boolean>(true)

  constructor(sourceState: SourceState) {
    $effect(() => {
      if (sourceState.source) {
        if (sourceState.source.type === 'image') {
          this.#hasImagesScope = false
        } else {
          this.#hasImagesScope = true
        }
      }
    })
  }

  get hasImagesScope() {
    return this.#hasImagesScope
  }

  set scope(scope: Scope) {
    this.#scope = scope
  }

  get scope() {
    return this.#scope
  }
}

export function setScopeState(sourceState: SourceState) {
  return setContext(SCOPE_KEY, new ScopeState(sourceState))
}

export function getScopeState() {
  const scopeState = getContext<ReturnType<typeof setScopeState>>(SCOPE_KEY)

  if (!scopeState) {
    throw new Error('ScopeState is not set')
  }

  return scopeState
}
