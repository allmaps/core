import classifyPoint from 'robust-point-in-polygon'

import {
  doBboxesIntersect,
  pixelToIntArrayIndex,
  pointToPixel
} from '@allmaps/stdlib'

import { GetImageDataValue, GetImageDataSize } from './types.js'
import {
  resourcePointInTile,
  tileToTileOriginPoint,
  clipTilePointToTile
} from './tiles.js'
import { applyTransform, invertTransform } from './matrix.js'

import type WarpedMapList from '../maps/WarpedMapList.js'
import type Viewport from '../viewport/Viewport.js'
import type TileCache from '../tilecache/TileCache.js'
import type { CachedTile } from '../tilecache/CacheableTile.js'

import type WarpedMap from '../maps/WarpedMap.js'
import type { Point } from '@allmaps/types'

const CHANNELS = 4

/**
 * Render to IntArray
 *
 * @export
 * @async
 * @template {WarpedMap} W
 * @template D
 * @param {WarpedMapList<W>} warpedMapList - WarpedMapList who's WarpedMaps will be rendered
 * @param {TileCache<D>} tileCache - TileCache who's tiles will be used
 * @param {Viewport} viewport - Viewport to render to. This can be the entire image, or a single XYZ tile
 * @param {GetImageDataValue<D>} getImageDataValue - Function to access the data of the image, at a specific index
 * @param {GetImageDataSize<D>} getImageDataSize - Function to access the size of the image
 * @param {Uint8ClampedArray} intArray - IntArray to render to
 * @returns {Promise<void>}
 */
export async function renderToIntArray<W extends WarpedMap, D>(
  warpedMapList: WarpedMapList<W>,
  tileCache: TileCache<D>,
  viewport: Viewport,
  getImageDataValue: GetImageDataValue<D>,
  getImageDataSize: GetImageDataSize<D>,
  intArray: Uint8ClampedArray
): Promise<void> {
  for (const warpedMap of warpedMapList.getWarpedMaps()) {
    if (
      !doBboxesIntersect(
        viewport.projectedGeoRectangleBbox,
        warpedMap.projectedGeoMaskBbox
      )
    ) {
      continue
    }

    const cachedTiles = tileCache.getMapCachedTiles(warpedMap.mapId)
    const canvasToProjectedGeoTransform = invertTransform(
      viewport.projectedGeoToCanvasTransform
    )

    // Step through all viewport pixels and set their color
    // Note: naming variables 'Pixel' instead of 'Point' when we are sure they are integer coordinate values
    for (
      let canvasPixelX = 0;
      canvasPixelX < viewport.canvasSize[0];
      canvasPixelX++
    ) {
      for (
        let canvasPixelY = 0;
        canvasPixelY < viewport.canvasSize[1];
        canvasPixelY++
      ) {
        const canvasPixel = [canvasPixelX, canvasPixelY] as Point

        // Get resourcePoint corresponding to this canvasPixel
        const projectedGeoPoint = applyTransform(
          canvasToProjectedGeoTransform,
          canvasPixel
        )
        const resourcePoint =
          warpedMap.projectedTransformer.transformToResource(projectedGeoPoint)

        // Apply mask: Check if resourcePoint is inside resource mask
        // classifyPoint returns an integer which determines the position of point relative to polygon:
        //   -1 if point lies inside polygon
        //    0 if point lies on the polygon's edge
        //    1 if point lies outside polygon
        if (classifyPoint(warpedMap.resourceMask, resourcePoint) === 1) {
          continue
        }

        // Find the tile on which resourcePoint is located
        // Note: we are currently waiting for all tiles to be cashed
        // If not, consider to use the tile with minimum scaleFactorDiff, as in fragmentShader
        let cachedTile: CachedTile<D> | undefined
        let foundCachedTile = false
        for (cachedTile of cachedTiles) {
          if (resourcePointInTile(resourcePoint, cachedTile.tile)) {
            foundCachedTile = true
            break
          }
        }

        // If tile is found, set color of this resourcePoint, i.e. canvasPixel
        if (foundCachedTile && cachedTile) {
          const tile = cachedTile.tile
          const tileSize = getImageDataSize(cachedTile.data)

          // Determine sub-pixel coordinates of the resourcePoint on the (scaled) tile: 'tilePoint'
          //
          // Schematic drawing of tilePoint inside a pixel of the (scaled) resource tile
          // tilePoint: +
          // Surrounding pixels of the (scaled) resource tile: *
          //
          //        Y
          //        ^
          // [0, 1] *---------* [1, 1]
          //        |         |
          //        |         |
          //        |   +     |
          // [0, 0] *---------* [1, 0] > X
          //
          const resourceTileOriginPoint = tileToTileOriginPoint(tile)
          const tilePoint = resourcePoint.map(
            (coordinate, index) =>
              (coordinate - resourceTileOriginPoint[index]) /
              tile.tileZoomLevel.scaleFactor
          ) as Point

          // Determine the tilePoint's four surrounding pixels: bottom-left, bottom-right, top-left, top-right
          const tilePointPixels = [
            pointToPixel(tilePoint, [0, 0]),
            pointToPixel(tilePoint, [1, 0]),
            pointToPixel(tilePoint, [0, 1]),
            pointToPixel(tilePoint, [1, 1])
          ]

          // Determine the index where to write this pixel's information in the IntArray
          const canvasPixelIntArrayIndex = pixelToIntArrayIndex(
            canvasPixel,
            viewport.canvasSize,
            CHANNELS
          )

          // Apply bilinear resampling:
          // for each color, set the color value in the intArray in the following way:
          // for the current tile point (derived earlier from resourcePoint and hence from canvasPoint)
          // go over all tile pixels surrounding it
          // multiply their color value and pixel weight, and add all of these together
          for (let color = 0; color < CHANNELS; color++) {
            intArray[canvasPixelIntArrayIndex + color] = tilePointPixels
              .map(
                (tilePointPixel) =>
                  getImageDataValue(
                    cachedTile!.data,
                    pixelToIntArrayIndex(
                      clipTilePointToTile(tilePointPixel, tile),
                      tileSize,
                      CHANNELS
                    ) + color
                  ) * bilinearPixelWeight(tilePointPixel, tilePoint)
              )
              .reduce((a, c) => a + c, 0)
          }
        }
      }
    }
  }
}

function bilinearPixelWeight(pixel: Point, point: Point): number {
  return (
    (1 - Math.abs(point[0] - pixel[0])) * (1 - Math.abs(point[1] - pixel[1]))
  )
}
