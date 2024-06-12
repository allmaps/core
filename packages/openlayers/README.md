# @allmaps/openlayers

Allmaps plugin for OpenLayers. Plugin that uses WebGL to show warped IIIF images on an OpenLayers map. The plugin works by loading [Georeference Annotations](https://preview.iiif.io/api/georef/extension/georef/).

Allmaps plugin for [Leaflet](https://leafletjs.com/). This plugin allows displaying georeferenced [IIIF images](https://iiif.io/) on a Leaflet map. The plugin works by loading [Georeference Annotations](https://iiif.io/api/georef/extension/georef/) and uses WebGL to transform images from a IIIF image server to overlay them on their correct geographical position. See [allmaps.org](https://allmaps.org) for more information.

[![Example of the Allmaps plugin for OpenLayers](https://raw.githubusercontent.com/allmaps/allmaps/main/packages/openlayers/example.jpg)](https://observablehq.com/@allmaps/openlayers-plugin)

Examples:

*   [Observable notebook](https://observablehq.com/@allmaps/openlayers-plugin)
*   [HTML example using ESM and Skypack](https://allmaps.org/allmaps/packages/openlayers/examples/skypack.html)
*   [HTML example using UMD and jsDelivr](https://allmaps.org/allmaps/packages/openlayers/examples/jsdelivr.html)

## How it works

This plugin exports the class `WarpedMapLayer`. You can add one or multiple Georeference Annotations (or AnnotationPages that contain multiple Georeference Annotations) to a WarpedMapLayer and add the WarpedMapLayer to your OpenLayers map. This will render all georeferenced maps defined by the Georeference Annotations.

To understand what happens under the hood for each georeferenced map, see the [@allmaps/render](../render/README.md) package.

## Installation

This package works in browsers and in Node.js as an ESM or an UMD module.

Install with pnpm:

```sh
pnpm install @allmaps/openlayers
```

You can build this package locally by running:

```sh
pnpm run build
```

As an alternative to loading using import, ESM and UMD bundled versions of the code are also provided under `/dist/bundled` (once the code is built). These are also published online, so can load them directly in a HTML script tag using a CDN.

```html
<script src="https://cdn.jsdelivr.net/npm/@allmaps/openlayers/dist/bundled/allmaps-openlayers-8.umd.js"></script>
```

When loading the bundled package, its classes are available under the `Allmaps` global variable:

```js
const warpedMapLayer = new Allmaps.WarpedMapLayer()
```

## Usage

Built for OpenLayers 8, but should work with OpenLayers 6 and OpenLayers 7 as well.

### Loading a Georeference Annotation

Creating a `WarpedMapLayer` and adding a Georeference Annotation to an OpenLayers map looks like this:

```js
import { WarpedMapLayer } from '@allmaps/openlayers'

const map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    })
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([-71.00661, 42.37124]),
    zoom: 14
  })
})

// Create WarpedMapLayer
const warpedMapLayer = new WarpedMapLayer()

// Add the WarpedMapLayer to the map and load a Georeference Annotation
const annotationUrl = 'https://annotations.allmaps.org/maps/a9458d2f895dcdfb'
map.addLayer(warpedMapLayer)
warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)
```

A Georeference Annotation can be added using the `addGeoreferenceAnnotation` and `addGeoreferenceAnnotationByUrl` functions:

```js
fetch(annotationUrl)
  .then((response) => response.json())
  .then((annotation) => warpedMapLayer.addGeoreferenceAnnotation(annotation))
```

Or:

```js
await warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)
```

### Events

The following events are emitted to inform you of the state of the WarpedMapLayer:

| Description                                                   | Type                      | Data                               |
| ------------------------------------------------------------- | ------------------------- | ---------------------------------- |
| A warped map has been added to the warped map list            | `warpedmapadded`          | `mapId: string`                    |
| A warped map has been removed from the warped map list        | `warpedmapremoved`        | `mapId: string`                    |
| A warped map enters the viewport                              | `warpedmapenter`          | `mapId: string`                    |
| A warped map leaves the viewport                              | `warpedmapleave`          | `mapId: string`                    |
| The visibility of some warpedMaps has changed                 | `visibilitychanged`       | `mapIds: string[]`                 |
| The cache loaded a first tile of a map                        | `firstmaptileloaded`      | `{mapId: string, tileUrl: string}` |
| All tiles requested for the current viewport have been loaded | `allrequestedtilesloaded` |                                    |

You can listen to them in the typical OpenLayers way. Here's an example:

```js
warpedMapLayer.on('warpedmapadded', (event) => {
  console.log(event.mapId, warpedMapLayer.getExtent())
})
```

### What is a *map*?

An OpenLayers map is an instance of the OpenLayers [`Map`](https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html) class, the central class of the OpenLayers API, used to create a map on a page and manipulate it.

In Allmaps there are multiple classes describing maps, one for each phase a map takes through the Allmaps rendering pipeline:

*   When a Georeference Annotation is parsed, an instance of the Georeferenced Map class is created from it.
*   When this map is loaded into an application for rendering, an instance of the Warped Map class is created from it.
*   Inside the WebGL2 rendering package, the `WebGL2WarpedMap` class is used to render the map.

All these map phases originating from the same Georeference Annotation have the same unique `mapId` property. This string value is used thoughout Allmaps (and in the API below) to identify a map. It is returned after adding a Georeference Annotation to a warpedMapLayer, so you can use it later to call functions on a specific map.

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

*   [Point](#point)
*   [Bbox](#bbox)
*   [TransformationType](#transformationtype)
*   [WarpedMapLayer](#warpedmaplayer)
    *   [Parameters](#parameters)
    *   [addGeoreferenceAnnotation](#addgeoreferenceannotation)
    *   [removeGeoreferenceAnnotation](#removegeoreferenceannotation)
    *   [addGeoreferenceAnnotationByUrl](#addgeoreferenceannotationbyurl)
    *   [removeGeoreferenceAnnotationByUrl](#removegeoreferenceannotationbyurl)
    *   [addGeoreferencedMap](#addgeoreferencedmap)
    *   [removeGeoreferencedMap](#removegeoreferencedmap)
    *   [getWarpedMapList](#getwarpedmaplist)
    *   [getWarpedMap](#getwarpedmap)
    *   [showMap](#showmap)
    *   [showMaps](#showmaps)
    *   [hideMap](#hidemap)
    *   [hideMaps](#hidemaps)
    *   [isMapVisible](#ismapvisible)
    *   [setMapResourceMask](#setmapresourcemask)
    *   [setMapsTransformationType](#setmapstransformationtype)
    *   [setMapsDistortionMeasure](#setmapsdistortionmeasure)
    *   [getLonLatExtent](#getlonlatextent)
    *   [getExtent](#getextent)
    *   [bringMapsToFront](#bringmapstofront)
    *   [sendMapsToBack](#sendmapstoback)
    *   [bringMapsForward](#bringmapsforward)
    *   [sendMapsBackward](#sendmapsbackward)
    *   [getMapZIndex](#getmapzindex)
    *   [setImageInformations](#setimageinformations)
    *   [getContainer](#getcontainer)
    *   [getCanvas](#getcanvas)
    *   [getMapOpacity](#getmapopacity)
    *   [setMapOpacity](#setmapopacity)
    *   [resetMapOpacity](#resetmapopacity)
    *   [setSaturation](#setsaturation)
    *   [resetSaturation](#resetsaturation)
    *   [setMapSaturation](#setmapsaturation)
    *   [resetMapSaturation](#resetmapsaturation)
    *   [setRemoveColor](#setremovecolor)
    *   [resetRemoveColor](#resetremovecolor)
    *   [setMapRemoveColor](#setmapremovecolor)
    *   [resetMapRemoveColor](#resetmapremovecolor)
    *   [setColorize](#setcolorize)
    *   [resetColorize](#resetcolorize)
    *   [setMapColorize](#setmapcolorize)
    *   [resetMapColorize](#resetmapcolorize)
    *   [setGrid](#setgrid)
    *   [resetGrid](#resetgrid)
    *   [setMapGrid](#setmapgrid)
    *   [resetMapGrid](#resetmapgrid)
    *   [dispose](#dispose)
    *   [clear](#clear)
    *   [render](#render)

### Point

Point

Type: \[[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)]

### Bbox

Bounding box

Type: \[[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)]

### TransformationType

Transformation type

Type: (`"helmert"` | `"polynomial"` | `"polynomial1"` | `"polynomial2"` | `"polynomial3"` | `"projective"` | `"thinPlateSpline"`)

### WarpedMapLayer

WarpedMapLayer class.

This class renders georeferenced maps from a Georeference Annotation on an OpenLayers map.
WarpedMapLayer is a subclass of [Layer](https://openlayers.org/en/latest/apidoc/module-ol_layer_Layer-Layer.html).

#### Parameters

*   `options` **WebGL2RendererOptions?** the WebGL2 renderer options

#### addGeoreferenceAnnotation

Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/).

##### Parameters

*   `annotation` **any** Georeference Annotation

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>>** the map IDs of the maps that were added, or an error per map

#### removeGeoreferenceAnnotation

Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/).

##### Parameters

*   `annotation` **any** Georeference Annotation

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>>** the map IDs of the maps that were removed, or an error per map

#### addGeoreferenceAnnotationByUrl

Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.

##### Parameters

*   `annotationUrl` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Georeference Annotation

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>>** the map IDs of the maps that were added, or an error per map

#### removeGeoreferenceAnnotationByUrl

Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.

##### Parameters

*   `annotationUrl` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Georeference Annotation

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>>** the map IDs of the maps that were removed, or an error per map

#### addGeoreferencedMap

Adds a Georeferenced map.

##### Parameters

*   `georeferencedMap` **unknown** Georeferenced map

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>** the map ID of the map that was added, or an error

#### removeGeoreferencedMap

Removes a Georeferenced map.

##### Parameters

*   `georeferencedMap` **unknown** Georeferenced map

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>** the map ID of the map that was remvoed, or an error

#### getWarpedMapList

Returns the WarpedMapList object that contains a list of the warped maps of all loaded maps

Returns **WarpedMapList** the warped map list

#### getWarpedMap

Returns a single map's warped map

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

Returns **(WebGL2WarpedMap | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))** the warped map

#### showMap

Make a single map visible

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

#### showMaps

Make multiple maps visible

##### Parameters

*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** IDs of the maps

#### hideMap

Make a single map invisible

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

#### hideMaps

Make multiple maps invisible

##### Parameters

*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** IDs of the maps

#### isMapVisible

Returns the visibility of a single map

##### Parameters

*   `mapId` &#x20;

Returns **([boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean) | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))** whether the map is visible

#### setMapResourceMask

Sets the resource mask of a single map

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `resourceMask` **Ring** new resource mask

#### setMapsTransformationType

Sets the transformation type of multiple maps

##### Parameters

*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** IDs of the maps
*   `transformation` **[TransformationType](#transformationtype)** new transformation type

#### setMapsDistortionMeasure

Sets the distortion measure of multiple maps

##### Parameters

*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** IDs of the maps
*   `distortionMeasure` **DistortionMeasure** new distortion measure

#### getLonLatExtent

Return the bounding box of all visible maps in the layer (inside or outside of the Viewport), in longitude/latitude coordinates.

Returns **([Bbox](#bbox) | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))** Bounding box of all warped maps

#### getExtent

Return the bounding box of all visible maps in the layer (inside or outside of the Viewport), in projected coordinates.

Returns **([Bbox](#bbox) | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))** bounding box of all warped maps

#### bringMapsToFront

Bring maps to front

##### Parameters

*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** IDs of the maps

#### sendMapsToBack

Send maps to back

##### Parameters

*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** IDs of the maps

#### bringMapsForward

Bring maps forward

##### Parameters

*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** IDs of the maps

#### sendMapsBackward

Send maps backward

##### Parameters

*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** IDs of the maps

#### getMapZIndex

Returns the z-index of a single map

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the warped map

Returns **([number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))** z-index of the warped map

#### setImageInformations

Sets the object that caches image information

##### Parameters

*   `imageInformations` **ImageInformations** Object that caches image information

#### getContainer

Gets the HTML container element of the layer

Returns **[HTMLElement](https://developer.mozilla.org/docs/Web/HTML/Element)** HTML element

#### getCanvas

Gets the HTML canvas element of the layer

Returns **([HTMLCanvasElement](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement) | null)** HTML Canvas element

#### getMapOpacity

Gets the opacity of a single map

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

Returns **([number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))** Opacity of the map

#### setMapOpacity

Sets the opacity of a single map

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `opacity` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque

#### resetMapOpacity

Resets the opacity of a single map to fully opaque

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

#### setSaturation

Sets the saturation of a single map

##### Parameters

*   `saturation` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** saturation between 0 and 1, where 0 is grayscale and 1 are the original colors

#### resetSaturation

Resets the saturation of a single map to the original colors

#### setMapSaturation

Sets the saturation of a single map

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `saturation` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** saturation between 0 and 1, where 0 is grayscale and 1 are the original colors

#### resetMapSaturation

Resets the saturation of a single map to the original colors

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

#### setRemoveColor

Removes a color from all maps

##### Parameters

*   `options` &#x20;
*   `transformOptions` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** remove color options

    *   `transformOptions.hexColor` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** hex color to remove
    *   `transformOptions.threshold` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** threshold between 0 and 1
    *   `transformOptions.hardness` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** hardness between 0 and 1

#### resetRemoveColor

Resets the color removal for all maps

#### setMapRemoveColor

Removes a color from a single map

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `options` &#x20;
*   `transformOptions` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** remove color options

    *   `transformOptions.hexColor` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** hex color to remove
    *   `transformOptions.threshold` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** threshold between 0 and 1
    *   `transformOptions.hardness` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** hardness between 0 and 1

#### resetMapRemoveColor

Resets the color for a single map

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

#### setColorize

Sets the colorization for all maps

##### Parameters

*   `hexColor` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** desired hex color

#### resetColorize

Resets the colorization for all maps

#### setMapColorize

Sets the colorization for a single mapID of the map

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `hexColor` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** desired hex color

#### resetMapColorize

Resets the colorization of a single map

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

#### setGrid

Sets the grid for all maps

##### Parameters

*   `enabled` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** whether to show the grid

#### resetGrid

Resets the grid for all maps

#### setMapGrid

Sets the grid for a single mapID of the map

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `enabled` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** whether to show the grid

#### resetMapGrid

Resets the grid of a single map

##### Parameters

*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

#### dispose

Disposes all WebGL resources and cached tiles

#### clear

Clears: removes all maps

#### render

Render the layer.

##### Parameters

*   `frameState` &#x20;

Returns **[HTMLElement](https://developer.mozilla.org/docs/Web/HTML/Element)** The rendered element
