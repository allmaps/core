import { createHighlighterCore } from 'shiki/core'
import getWasm from 'shiki/wasm'
import nord from 'shiki/themes/nord.mjs'

const highlighter = await createHighlighterCore({
  themes: [nord],
  langs: [import('shiki/langs/json.mjs')],
  loadWasm: getWasm
})

export function highlight(json: unknown) {
  return highlighter.codeToHtml(JSON.stringify(json, null, 2), {
    lang: 'json',
    theme: 'nord'
  })
}
