import BaseRenderer from './BaseRenderer.js'
import CacheableImageDataTile from '../tilecache/CacheableImageDataTile.js'
import { createWarpedMapFactory } from '../maps/WarpedMap.js'
import Viewport from '../viewport/Viewport.js'

import { renderToIntArray } from '../shared/render-to-int-array.js'
import type { Renderer, CanvasRendererOptions } from '../shared/types.js'
import type WarpedMap from '../maps/WarpedMap.js'

import type { Size } from '@allmaps/types'

/**
 * Class that renders WarpedMaps to a HTML Canvas element with the Canvas 2D API
 *
 * @export
 * @class CanvasRenderer
 * @typedef {CanvasRenderer}
 * @extends {BaseRenderer}
 */
export default class CanvasRenderer
  extends BaseRenderer<WarpedMap, ImageData>
  implements Renderer
{
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D

  constructor(
    canvas: HTMLCanvasElement,
    options?: Partial<CanvasRendererOptions>
  ) {
    super(
      CacheableImageDataTile.createFactory(),
      createWarpedMapFactory(),
      options
    )

    this.canvas = canvas
    this.context = canvas.getContext('2d') as CanvasRenderingContext2D
  }

  /**
   * Render the map for a given viewport.
   *
   * If no viewport is specified, a viewport is deduced based on the WarpedMapList and canvas width and hight.
   *
   * @param {Viewport} [viewport] - the viewport to render
   */
  async render(viewport?: Viewport): Promise<void> {
    this.viewport =
      viewport ||
      Viewport.fromSizeAndMaps(
        [this.canvas.width, this.canvas.height],
        this.warpedMapList
      )

    const imageData = new ImageData(
      this.viewport.canvasSize[0],
      this.viewport.canvasSize[1]
    )

    await Promise.allSettled(this.loadMissingImageInfosInViewport())

    this.requestFetchableTiles()
    await this.tileCache.allRequestedTilesLoaded()

    await renderToIntArray(
      this.warpedMapList,
      this.tileCache,
      this.viewport,
      this.getTileImageData,
      this.getTileSize,
      imageData.data
    )

    this.context.putImageData(imageData, 0, 0)
  }

  private getTileImageData(data: ImageData, index: number): number {
    return data.data[index]
  }

  private getTileSize(data: ImageData): Size {
    return [data.width, data.height]
  }
}
