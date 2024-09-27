import type { LanguageString } from '@allmaps/iiif-parser'

import type {
  Image as IIIFImage,
  EmbeddedImage as EmbeddedIIIFImage,
  Manifest as IIIFManifest,
  EmbeddedManifest as EmbeddedIIIFManifest,
  Collection as IIIFCollection
} from '@allmaps/iiif-parser'

function getImagesInternal(
  images: (IIIFImage | EmbeddedIIIFImage)[],
  parsedIiif: IIIFManifest | EmbeddedIIIFManifest | IIIFCollection
) {
  if (parsedIiif.type === 'collection') {
    parsedIiif.items.map((item) => getImagesInternal(images, item))
    // TODO
  } else if (parsedIiif.type === 'manifest' && 'canvases' in parsedIiif) {
    for (const canvas of parsedIiif.canvases) {
      images.push(canvas.image)
    }
  }
}

export function getImages(
  parsedIiif: IIIFImage | IIIFManifest | IIIFCollection
): (IIIFImage | EmbeddedIIIFImage)[] {
  const images: (IIIFImage | EmbeddedIIIFImage)[] = []
  if (parsedIiif.type === 'image') {
    images.push(parsedIiif)
  } else {
    getImagesInternal(images, parsedIiif)
  }

  return images
}

export function parseLanguageString(
  languageString?: LanguageString,
  preferredLanguage?: string
) {
  if (!languageString) {
    return ''
  }

  let strings: string[] = []

  if (preferredLanguage && languageString[preferredLanguage]) {
    strings = languageString[preferredLanguage]
  } else if (languageString['none']) {
    strings = languageString['none']
  } else if (typeof languageString === 'object' && languageString !== null) {
    if (Object.values(languageString)[0]) {
      strings = Object.values(languageString)[0]
    }
  }

  return strings.join(' ')
}
