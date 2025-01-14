import BaseRenderer from './BaseRenderer.js'
import Viewport from '../viewport/Viewport.js'
import { createWarpedMapFactory } from '../maps/WarpedMap.js'
import CacheableIntArrayTile from '../tilecache/CacheableIntArrayTile.js'

import type {
  Renderer,
  GetImageData,
  GetImageDataValue,
  GetImageDataSize,
  IntArrayRendererOptions
} from '../shared/types.js'

import type WarpedMap from '../maps/WarpedMap.js'

import { renderToIntArray } from '../shared/render-to-int-array.js'

const CHANNELS = 4

/**
 * Class that renders WarpedMaps to an IntArray
 *
 * @export
 * @class IntArrayRenderer
 * @typedef {IntArrayRenderer}
 * @extends {BaseRenderer}
 */
export default class IntArrayRenderer<D>
  extends BaseRenderer<WarpedMap, D>
  implements Renderer
{
  getImageDataValue: GetImageDataValue<D>
  getImageDataSize: GetImageDataSize<D>

  constructor(
    getImageData: GetImageData<D>,
    getImageDataValue: GetImageDataValue<D>,
    getImageDataSize: GetImageDataSize<D>,
    options?: Partial<IntArrayRendererOptions>
  ) {
    super(
      CacheableIntArrayTile.createFactory(getImageData),
      createWarpedMapFactory(),
      options
    )
    this.getImageDataValue = getImageDataValue
    this.getImageDataSize = getImageDataSize
  }

  /**
   * Render the map for a given viewport.
   *
   * @param {Viewport} viewport - the viewport to render
   */
  async render(viewport: Viewport): Promise<Uint8ClampedArray> {
    this.viewport = viewport

    await Promise.allSettled(this.loadMissingImageInfosInViewport())

    this.requestFetchableTiles()
    await this.tileCache.allRequestedTilesLoaded()

    const intArray = new Uint8ClampedArray(
      this.viewport.canvasSize[0] * this.viewport.canvasSize[1] * CHANNELS
    )

    await renderToIntArray(
      this.warpedMapList,
      this.tileCache,
      this.viewport,
      this.getImageDataValue,
      this.getImageDataSize,
      intArray
    )

    return intArray
  }
}
