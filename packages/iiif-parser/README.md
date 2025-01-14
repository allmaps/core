# @allmaps/iiif-parser

This is a JavaScript module that parser IIIF [Collections](https://iiif.io/api/presentation/3.0/#51-collection), [Manifests](https://iiif.io/api/presentation/3.0/#52-manifest) and [Images](https://iiif.io/api/image/3.0/#5-image-information). This is a core module of [Allmaps](https://allmaps.org/) and is used in all its apps and components.

*Note: this module parses IIIF data to an intermediate format that is used by Allmaps internally. It does not parse **all** properties defined by the IIIF Image and Presentation APIs, only properties that are needed for Allmaps to function. See the files in the [`src/classes`](src/classes) and [`src/schemas`](src/schemas) directories for details about these proeprties.*

@allmaps/iiif-parser is written in TypeScript and is built using [Zod](https://zod.dev/).

Versions 1, 2 and 3 of the IIIF Image and Presentation APIs are supported.

This module has been tested on a wide variety of IIIF servers. Run `npm test` to run all tests.

## Installation

This is an ESM-only module that works in browsers and Node.js.

Node.js:

First, run `npm install @allmaps/iiif-parser` to add this module to your project.

```js
import { IIIF } from '@allmaps/iiif-parser'
```

Browser:

```html
<script type="module">
  import { IIIF } from 'https://unpkg.com/@allmaps/iiif-parser?module'
</script>
```

## Usage

```js
import { IIIF } from '@allmaps/iiif-parser'

const manifestUrl =
  'https://collections.leventhalmap.org/search/commonwealth:wd376720z/manifest'
const manifest = await fetch(manifestUrl).then((response) => response.json())
const parsedManifest = IIIF.parse(manifest)
console.log(parsedManifest)
```

This will log `parsedManifest` to the console:

```json
{
  "embedded": false,
  "type": "manifest",
  "uri": "https://ark.digitalcommonwealth.org/ark:/50959/wd376720z/manifest",
  "majorVersion": 2,
  "label": {
    "none": [
      "Map of Boston and vicinity showing tracks operated by the Boston Elevated Railway Co., surface lines"
    ]
  },
  "canvases": [
    {
      "type": "canvas",
      "width": 7486,
      "height": 9138,
      "uri": "https://ark.digitalcommonwealth.org/ark:/50959/wd376720z/canvas/wd3767217",
      "label": {
        "none": ["image 1"]
      },
      "image": {
        "embedded": true,
        "type": "image",
        "uri": "https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:wd3767217",
        "majorVersion": 2,
        "supportsAnyRegionAndSize": true,
        "width": 7486,
        "height": 9138
      }
    }
  ],
  "metadata": [
    {
      "label": {
        "none": ["Title"]
      },
      "value": {
        "none": [
          "Map of Boston and vicinity showing tracks operated by the Boston Elevated Railway Co., surface lines"
        ]
      }
    },
    {
      "label": {
        "none": ["Date"]
      },
      "value": {
        "none": ["1898"]
      }
    },
    {
      "label": {
        "none": ["Publisher"]
      },
      "value": {
        "none": ["Boston, Mass : [Geo. H. Walker & Co.]"]
      }
    },
    {
      "label": {
        "none": ["Type of Resource"]
      },
      "value": {
        "none": ["Cartographic"]
      }
    },
    {
      "label": {
        "none": ["Format"]
      },
      "value": {
        "none": ["Maps"]
      }
    },
    {
      "label": {
        "none": ["Language"]
      },
      "value": {
        "none": ["English"]
      }
    },
    {
      "label": {
        "none": ["Subjects"]
      },
      "value": {
        "none": [
          "Boston Elevated Railway Company",
          "Street-railroads--Massachusetts--Boston--Maps",
          "Boston (Mass.)--Maps",
          "Massachusetts--Maps"
        ]
      }
    },
    {
      "label": {
        "none": ["Location"]
      },
      "value": {
        "none": ["Boston Public Library"]
      }
    },
    {
      "label": {
        "none": ["Collection (local)"]
      },
      "value": {
        "none": ["Norman B. Leventhal Map Center Collection"]
      }
    },
    {
      "label": {
        "none": ["Identifier"]
      },
      "value": {
        "none": [
          "https://ark.digitalcommonwealth.org/ark:/50959/wd376720z",
          "06_01_003041",
          "G3764.B6P33 1898 .M3",
          "39999058997337"
        ]
      }
    },
    {
      "label": {
        "none": ["Terms of Use"]
      },
      "value": {
        "none": [
          "No known copyright restrictions.",
          "No known restrictions on use."
        ]
      }
    }
  ]
}
```

You can also call the `parse` function on a specific IIIF class:

```js
import { Image } from '@allmaps/iiif-parser'

const imageUrl =
  'https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:wd3767217'
const image = await fetch(`${imageUrl}/info.json`).then((response) =>
  response.json()
)
const parsedImage = Image.parse(image)
console.log(parsedImage)
```

This will log `parsedImage` to the console:

```json
{
  "embedded": false,
  "type": "image",
  "uri": "https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:wd3767217",
  "majorVersion": 2,
  "supportsAnyRegionAndSize": true,
  "width": 7486,
  "height": 9138,
  "tileZoomLevels": [
    {
      "scaleFactor": 1,
      "width": 1024,
      "height": 1024,
      "originalWidth": 1024,
      "originalHeight": 1024,
      "columns": 8,
      "rows": 9
    },
    {
      "scaleFactor": 2,
      "width": 1024,
      "height": 1024,
      "originalWidth": 2048,
      "originalHeight": 2048,
      "columns": 4,
      "rows": 5
    },
    {
      "scaleFactor": 4,
      "width": 1024,
      "height": 1024,
      "originalWidth": 4096,
      "originalHeight": 4096,
      "columns": 2,
      "rows": 3
    },
    {
      "scaleFactor": 8,
      "width": 1024,
      "height": 1024,
      "originalWidth": 8192,
      "originalHeight": 8192,
      "columns": 1,
      "rows": 2
    },
    {
      "scaleFactor": 16,
      "width": 1024,
      "height": 1024,
      "originalWidth": 16384,
      "originalHeight": 16384,
      "columns": 1,
      "rows": 1
    },
    {
      "scaleFactor": 32,
      "width": 1024,
      "height": 1024,
      "originalWidth": 32768,
      "originalHeight": 32768,
      "columns": 1,
      "rows": 1
    },
    {
      "scaleFactor": 64,
      "width": 1024,
      "height": 1024,
      "originalWidth": 65536,
      "originalHeight": 65536,
      "columns": 1,
      "rows": 1
    }
  ],
  "sizes": [
    {
      "width": 117,
      "height": 143
    },
    {
      "width": 234,
      "height": 286
    },
    {
      "width": 468,
      "height": 571
    },
    {
      "width": 936,
      "height": 1142
    },
    {
      "width": 1872,
      "height": 2285
    },
    {
      "width": 3743,
      "height": 4569
    },
    {
      "width": 7486,
      "height": 9138
    }
  ]
}
```

You can check if a parsed IIIF resource object is of a specific class by using the `instanceof` operator or checking the `type` property:

```js
import { IIIF, Manifest } from '@allmaps/iiif-parser'

const url =
  'https://collections.leventhalmap.org/search/commonwealth:wd376720z/manifest'
const iiif = await fetch(url).then((response) => response.json())
const parsedIiif = IIIF.parse(manifest)

if (parsedIiif instanceof IIIFImage && parsedIiif.type === 'image') {
  console.log('This is a IIIF Manifest!')
}
```

## CLI

Parsing IIIF resources is also possible using the [Allmaps CLI](https://github.com/allmaps/allmaps/tree/main/apps/cli).

For example:

```sh
curl https://collections.leventhalmap.org/search/commonwealth:wd376720z/manifest | allmaps iiif parse
```

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

*   [MajorVersion](#majorversion)
*   [LanguageString](#languagestring)
*   [Metadata](#metadata)
*   [Metadata](#metadata-1)
*   [MetadataItem](#metadataitem)
    *   [Properties](#properties)
*   [Size](#size)
    *   [Properties](#properties-1)
*   [Region](#region)
    *   [Properties](#properties-2)
*   [ImageRequest](#imagerequest)
    *   [Properties](#properties-3)
*   [IIIF](#iiif)
    *   [parse](#parse)
*   [Collection](#collection)
    *   [Properties](#properties-4)
    *   [parse](#parse-1)
*   [EmbeddedManifest](#embeddedmanifest)
    *   [Properties](#properties-5)
*   [Manifest](#manifest)
    *   [Properties](#properties-6)
    *   [parse](#parse-2)
*   [Canvas](#canvas)
    *   [Properties](#properties-7)
*   [EmbeddedImage](#embeddedimage)
    *   [Properties](#properties-8)
    *   [getImageUrl](#getimageurl)
*   [Image](#image)
    *   [Properties](#properties-9)
    *   [getIiifTile](#getiiiftile)
    *   [getThumbnail](#getthumbnail)
    *   [parse](#parse-3)

### MajorVersion

IIIF API version

Type: (`1` | `2` | `3`)

### LanguageString

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String), [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>>

### Metadata

Type: [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[MetadataItem](#metadataitem)>

### Metadata

Type: [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[MetadataItem](#metadataitem)>

### MetadataItem

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Properties

*   `label` **[LanguageString](#languagestring)** Metadata label
*   `value` **[LanguageString](#languagestring)** Metadata value

### Size

Image size, with width and height in pixels

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Properties

*   `width` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Width, in pixels
*   `height` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Height, in pixels

### Region

Image region, with x, y, width, and height in pixels

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Properties

*   `x` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** X coordinate, in pixels
*   `y` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Y coordinate, in pixels
*   `width` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Width, in pixels
*   `height` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Height, in pixels

### ImageRequest

Image request, with region and size

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Properties

*   `region` **[Region](#region)?** Image region
*   `size` **[Size](#size)?** Image size

### IIIF

Base class that contains a static parse function for IIIF resources

#### parse

Parses as IIIF resource and returns a class containing the parsed version

##### Parameters

*   `iiifResource` **any** Source data of a IIIF resource
*   `majorVersion` **[MajorVersion](#majorversion)** IIIF API version of resource. If not provided, it will be determined automatically (optional, default `null`)

Returns **([Image](#image) | [Manifest](#manifest) | [Collection](#collection))** Parsed IIIF resource

### Collection

Parsed IIIF Collection

#### Properties

*   `uri` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** URI of Collection
*   `label` **[LanguageString](#languagestring)?** Label of Collection
*   `items` **([Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[Collection](#collection)> | [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[Manifest](#manifest)> | [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[EmbeddedManifest](#embeddedmanifest)>)?** Items in Collection
*   `majorVersion` **[MajorVersion](#majorversion)?** IIIF API version of Collection
*   `type` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** Resource type, equals 'collection'

#### parse

Parses a IIIF Collection and returns a [Collection](#collection) containing the parsed version

##### Parameters

*   `iiifCollection` **any** Source data of IIIF Collection
*   `majorVersion` **[MajorVersion](#majorversion)** IIIF API version of Collection. If not provided, it will be determined automatically (optional, default `null`)

Returns **[Collection](#collection)** Parsed IIIF Collection

### EmbeddedManifest

Parsed IIIF Manifest, embedded in a Collection

#### Properties

*   `embedded` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** Whether the Manifest is embedded in a Collection
*   `uri` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** URI of Manifest
*   `label` **[LanguageString](#languagestring)?** Label of Manifest
*   `majorVersion` **[MajorVersion](#majorversion)?** IIIF API version of Manifest
*   `type` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** Resource type, equals 'manifest'

### Manifest

**Extends EmbeddedManifest**

Parsed IIIF Manifest

#### Properties

*   `canvases` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[Canvas](#canvas)>** Array of parsed canvases
*   `description` **[LanguageString](#languagestring)?** Description of Manifest
*   `metadata` **[Metadata](#metadata)?** Metadata of Manifest

#### parse

Parses a IIIF resource and returns a [Manifest](#manifest) containing the parsed version

##### Parameters

*   `iiifManifest` **any** Source data of IIIF Manifest
*   `majorVersion` **[MajorVersion](#majorversion)** IIIF API version of Manifest. If not provided, it will be determined automatically (optional, default `null`)

Returns **[Manifest](#manifest)** Parsed IIIF Manifest

### Canvas

Parsed IIIF Canvas

#### Properties

*   `uri` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** URI of Canvas
*   `label` **[LanguageString](#languagestring)?** Label of Manifest
*   `metadata` **[Metadata](#metadata)?** Metadata of Manifest
*   `image` **([EmbeddedImage](#embeddedimage) | [Image](#image))?** Image of painted on Canvas
*   `height` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** Height of Canvas
*   `width` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** Width of Canvas
*   `type` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** Resource type, equals 'canvas'

### EmbeddedImage

Parsed IIIF Image, embedded in a Canvas

#### Properties

*   `embedded` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** Whether the Image is embedded in a Canvas
*   `type` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** Resource type, equals 'image'
*   `uri` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** URI of Image
*   `majorVersion` **[MajorVersion](#majorversion)** IIIF API version of Image
*   `supportsAnyRegionAndSize` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** Whether the associated Image Service supports any region and size
*   `maxWidth` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** Maximum width of the associated Image Service
*   `maxHeight` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** Maximum height of the associated Image Service
*   `maxArea` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** Maximum area of the associated Image Service
*   `width` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Width of Image
*   `height` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Height of Image

#### getImageUrl

Generates a IIIF Image API URL for the requested region and size

##### Parameters

*   `imageRequest` **[ImageRequest](#imagerequest)** Image request object containing the desired region and size of the requested image

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Image API URL that can be used to fetch the requested image

### Image

**Extends EmbeddedImage**

Parsed IIIF Image

#### Properties

*   `tileZoomLevels` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<TileZoomLevel>** Array of parsed tile zoom levels
*   `sizes` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[Size](#size)>?** Array of parsed sizes

#### getIiifTile

Returns a Image request object for a tile with the requested zoom level, column, and row

##### Parameters

*   `zoomLevel` **TileZoomLevel** Desired zoom level of the requested tile
*   `column` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Column of the requested tile
*   `row` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Row of the requested tile

Returns **[ImageRequest](#imagerequest)** Image request object that can be used to fetch the requested tile

#### getThumbnail

Returns a Image request object for the requested region and size

##### Parameters

*   `size` **SizeObject** Size of the requested thumbnail
*   `mode` **Fit** Desired fit mode of the requested thumbnail (optional, default `'cover'`)

Returns **[ImageRequest](#imagerequest)** Image request object that can be used to fetch the requested thumbnail

#### parse

Parses a IIIF image and returns a [Image](#image) containing the parsed version

##### Parameters

*   `iiifImage` **any** Source data of IIIF Image
*   `majorVersion` **[MajorVersion](#majorversion)** IIIF API version of Image. If not provided, it will be determined automatically (optional, default `null`)

Returns **[Image](#image)** Parsed IIIF Image
