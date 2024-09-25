import { goto } from '$app/navigation'

import type { Page } from '@sveltejs/kit'

import type { RouteID, Params } from '$lib/shared/types.js'

export function createRouteUrl(
  $page: Page,
  id: RouteID,
  params?: Partial<Params>
) {
  const searchParams = new URLSearchParams($page.url.searchParams)
  for (const [param, value] of Object.entries(params || {})) {
    if (value !== undefined) {
      if (value) {
        searchParams.set(param, value)
      } else {
        searchParams.delete(param)
      }
    }
  }

  return `/${id}?${searchParams}`
}

export function gotoRoute(url: string) {
  goto(url, {
    replaceState: false,
    keepFocus: true
  })
}

export function getRouteId($page: Page) {
  return $page.route.id?.slice(1) as RouteID
}
