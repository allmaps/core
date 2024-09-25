import { setContext, getContext } from 'svelte'

import type { Scope } from '$lib/shared/types.js'

const SCOPE_KEY = Symbol('scope')

export class ScopeState {
  #scope = $state<Scope>('images')

  set scope(scope: Scope) {
    this.#scope = scope
  }

  get scope() {
    return this.#scope
  }
}

export function setScopeState() {
  return setContext(SCOPE_KEY, new ScopeState())
}

export function getScopeState() {
  const scopeState = getContext<ReturnType<typeof setScopeState>>(SCOPE_KEY)

  if (!scopeState) {
    throw new Error('ScopeState is not set')
  }

  return scopeState
}
