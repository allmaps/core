import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import getWasm from 'shiki/wasm'
import nord from 'shiki/themes/nord.mjs'

let highlighter: HighlighterCore | undefined

async function initialize() {
  highlighter = await createHighlighterCore({
    themes: [nord],
    langs: [import('shiki/langs/json.mjs')],
    loadWasm: getWasm
  })
}

export function highlight(json: unknown) {
  if (highlighter) {
    return highlighter.codeToHtml(JSON.stringify(json, null, 2), {
      lang: 'json',
      theme: 'nord'
    })
  }

  return ''
}

initialize()
