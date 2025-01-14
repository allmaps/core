import { throttle } from 'lodash-es'

import {
  hexToFractionalRgb,
  maxOfNumberOrUndefined,
  squaredDistance
} from '@allmaps/stdlib'
import { supportedDistortionMeasures } from '@allmaps/transform'
import { red, green, darkblue, yellow, black } from '@allmaps/tailwind'

import BaseRenderer from './BaseRenderer.js'
import WebGL2WarpedMap, {
  createWebGL2WarpedMapFactory
} from '../maps/WebGL2WarpedMap.js'
import CachedImageDataTile from '../tilecache/CacheableWorkerImageDataTile.js'
import {
  WarpedMapEvent,
  WarpedMapEventType,
  WarpedMapTileEventDetail
} from '../shared/events.js'
import {
  multiplyTransform,
  invertTransform,
  transformToMatrix4
} from '../shared/matrix.js'
import { createShader, createProgram } from '../shared/webgl2.js'
import Viewport from '../viewport/Viewport.js'

import mapVertexShaderSource from '../shaders/map/vertex-shader.glsl'
import mapFragmentShaderSource from '../shaders/map/fragment-shader.glsl'
import linesVertexShaderSource from '../shaders/lines/vertex-shader.glsl'
import linesFragmentShaderSource from '../shaders/lines/fragment-shader.glsl'
import pointsVertexShaderSource from '../shaders/points/vertex-shader.glsl'
import pointsFragmentShaderSource from '../shaders/points/fragment-shader.glsl'

import type { DebouncedFunc } from 'lodash-es'

import type FetchableTile from '../tilecache/FetchableTile.js'

import type {
  Renderer,
  RenderOptions,
  RemoveColorOptions,
  ColorizeOptions,
  GridOptions,
  WebGL2RendererOptions
} from '../shared/types.js'

const THROTTLE_PREPARE_RENDER_WAIT_MS = 200
const THROTTLE_PREPARE_RENDER_OPTIONS = {
  leading: true,
  trailing: true
}

const THROTTLE_CHANGED_WAIT_MS = 50
const THROTTLE_CHANGED_OPTIONS = {
  leading: true,
  trailing: true
}

const DEBUG = false // TODO: set using options
export const RENDER_MAPS = true // TODO: set using options
export const RENDER_LINES = false // TODO: set using options
export const RENDER_POINTS = false // TODO: set using options

const DEFAULT_OPACITY = 1
const DEFAULT_SATURATION = 1
const DEFAULT_REMOVE_COLOR_THRESHOLD = 0
const DEFAULT_REMOVE_COLOR_HARDNESS = 0.7
const SIGNIFICANT_VIEWPORT_DISTANCE = 5
const ANIMATION_DURATION = 750

/**
 * Class that renders WarpedMaps to a WebGL 2 context
 *
 * @export
 * @class WebGL2Renderer
 * @typedef {WebGL2Renderer}
 * @extends {BaseRenderer}
 */
export default class WebGL2Renderer
  extends BaseRenderer<WebGL2WarpedMap, ImageData>
  implements Renderer
{
  gl: WebGL2RenderingContext
  mapProgram: WebGLProgram
  linesProgram: WebGLProgram
  pointsProgram: WebGLProgram

  previousSignificantViewport: Viewport | undefined

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  lastAnimationFrameRequestId: number | undefined
  animating = false
  transformationTransitionStart: number | undefined
  animationProgress = 0

  disableRender = false

  private throttledPrepareRenderInternal: DebouncedFunc<
    typeof this.prepareRenderInternal
  >

  private throttledChanged: DebouncedFunc<typeof this.changed>

  /**
   * Creates an instance of WebGL2Renderer.
   *
   * @constructor
   * @param {WebGL2RenderingContext} gl - WebGL 2 rendering context
   * @param {WebGL2RendererOptions} options - options
   */
  constructor(
    gl: WebGL2RenderingContext,
    options?: Partial<WebGL2RendererOptions>
  ) {
    const mapVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      mapVertexShaderSource
    )
    const mapFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      mapFragmentShaderSource
    )

    const linesVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      linesVertexShaderSource
    )
    const linesFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      linesFragmentShaderSource
    )

    const pointsVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      pointsVertexShaderSource
    )
    const pointsFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      pointsFragmentShaderSource
    )

    const mapProgram = createProgram(gl, mapVertexShader, mapFragmentShader)
    const linesProgram = createProgram(
      gl,
      linesVertexShader,
      linesFragmentShader
    )
    const pointsProgram = createProgram(
      gl,
      pointsVertexShader,
      pointsFragmentShader
    )

    super(
      CachedImageDataTile.createFactory(),
      createWebGL2WarpedMapFactory(gl, mapProgram, linesProgram, pointsProgram),
      options
    )

    this.gl = gl
    this.mapProgram = mapProgram
    this.linesProgram = linesProgram
    this.pointsProgram = pointsProgram

    // Unclear how to remove shaders, possibly already after linking to program, see:
    // https://stackoverflow.com/questions/9113154/proper-way-to-delete-glsl-shader
    // https://stackoverflow.com/questions/27237696/webgl-detach-and-delete-shaders-after-linking
    gl.deleteShader(mapVertexShader)
    gl.deleteShader(mapFragmentShader)
    gl.deleteShader(mapVertexShader)
    gl.deleteShader(mapFragmentShader)
    gl.deleteShader(mapVertexShader)
    gl.deleteShader(mapFragmentShader)

    gl.disable(gl.DEPTH_TEST)

    this.addEventListeners()

    this.throttledPrepareRenderInternal = throttle(
      this.prepareRenderInternal.bind(this),
      THROTTLE_PREPARE_RENDER_WAIT_MS,
      THROTTLE_PREPARE_RENDER_OPTIONS
    )

    this.throttledChanged = throttle(
      this.changed.bind(this),
      THROTTLE_CHANGED_WAIT_MS,
      THROTTLE_CHANGED_OPTIONS
    )
  }

  initializeWebGL(gl: WebGL2RenderingContext) {
    // This code is duplicated from the constructor to allow for context loss and restoration
    // Can't call this function in the constructor, because 'super' must be called before accessing 'this'
    const mapVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      mapVertexShaderSource
    )
    const mapFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      mapFragmentShaderSource
    )

    const linesVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      linesVertexShaderSource
    )
    const linesFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      linesFragmentShaderSource
    )

    const pointsVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      pointsVertexShaderSource
    )
    const pointsFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      pointsFragmentShaderSource
    )

    const mapProgram = createProgram(gl, mapVertexShader, mapFragmentShader)
    const linesProgram = createProgram(
      gl,
      linesVertexShader,
      linesFragmentShader
    )
    const pointsProgram = createProgram(
      gl,
      pointsVertexShader,
      pointsFragmentShader
    )

    this.gl = gl
    this.mapProgram = mapProgram
    this.linesProgram = linesProgram
    this.pointsProgram = pointsProgram

    gl.disable(gl.DEPTH_TEST)

    for (const webgl2WarpedMap of this.warpedMapList.getWarpedMaps()) {
      webgl2WarpedMap.initializeWebGL(mapProgram, linesProgram, pointsProgram)
    }
  }

  /**
   * Get the opacity of the renderer
   *
   * @returns {(number | undefined)}
   */
  getOpacity(): number | undefined {
    return this.opacity
  }

  /**
   * Set the opacity of the renderer
   *
   * @param {number} opacity - opacity to set
   */
  setOpacity(opacity: number): void {
    this.opacity = opacity
  }

  /**
   * Reset the opacity of the renderer
   */
  resetOpacity(): void {
    this.opacity = DEFAULT_OPACITY
  }

  /**
   * Get the opacity of a map
   *
   * @param {string} mapId - ID of the map
   * @returns {(number | undefined)}
   */
  getMapOpacity(mapId: string): number | undefined {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)

    if (webgl2WarpedMap) {
      return webgl2WarpedMap.opacity
    }
  }

  /**
   * Set the opacity of a map
   *
   * @param {string} mapId - ID of the map
   * @param {number} opacity - opacity to set
   */
  setMapOpacity(mapId: string, opacity: number): void {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      webgl2WarpedMap.opacity = Math.min(Math.max(opacity, 0), 1)
    }
  }

  /**
   * Rreset the opacity of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapOpacity(mapId: string): void {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      webgl2WarpedMap.opacity = DEFAULT_OPACITY
    }
  }

  /**
   * Get the remove color options of the renderer
   *
   * @returns {(Partial<RemoveColorOptions> | undefined)}
   */
  getRemoveColorOptions(): Partial<RemoveColorOptions> | undefined {
    return this.renderOptions.removeColorOptions
  }

  /**
   * Set the remove color options of the renderer
   *
   * @param {RemoveColorOptions} removeColorOptions
   */
  setRemoveColorOptions(removeColorOptions: RemoveColorOptions) {
    this.renderOptions.removeColorOptions = removeColorOptions
  }

  /**
   * Reset the remove color options of the renderer
   */
  resetRemoveColorOptions() {
    this.renderOptions.removeColorOptions = undefined
  }

  /**
   * Get the remove color options of a map
   *
   * @param {string} mapId - ID of the map
   * @returns {(Partial<RemoveColorOptions> | undefined)}
   */
  getMapRemoveColorOptions(
    mapId: string
  ): Partial<RemoveColorOptions> | undefined {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      return webgl2WarpedMap.renderOptions.removeColorOptions
    }
  }

  /**
   * Set the remove color options of a map
   *
   * @param {string} mapId - ID of the map
   * @param {RemoveColorOptions} removeColorOptions - the 'remove color options' to set
   */
  setMapRemoveColorOptions(
    mapId: string,
    removeColorOptions: RemoveColorOptions
  ): void {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      webgl2WarpedMap.renderOptions.removeColorOptions = removeColorOptions
    }
  }

  /**
   * Reset the remove color options of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapRemoveColorOptions(mapId: string): void {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      webgl2WarpedMap.renderOptions.removeColorOptions = undefined
    }
  }

  /**
   * Get the colorize options of the renderer
   *
   * @returns {(Partial<ColorizeOptions> | undefined)}
   */
  getColorizeOptions(): Partial<ColorizeOptions> | undefined {
    return this.renderOptions.colorizeOptions
  }

  /**
   * Set the colorize options of the renderer
   *
   * @param {ColorizeOptions} colorizeOptions - the colorize options to set
   */
  setColorizeOptions(colorizeOptions: ColorizeOptions): void {
    this.renderOptions.colorizeOptions = colorizeOptions
  }

  /**
   * Reset the colorize options of the renderer
   */
  resetColorizeOptions(): void {
    this.renderOptions.colorizeOptions = undefined
  }

  /**
   * Get the colorize options of a map
   *
   * @param {string} mapId - ID of the map
   * @returns {(Partial<ColorizeOptions> | undefined)}
   */
  getMapColorizeOptions(mapId: string): Partial<ColorizeOptions> | undefined {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      return webgl2WarpedMap.renderOptions.colorizeOptions
    }
  }

  /**
   * Set the colorize options of a map
   *
   * @param {string} mapId - ID of the map
   * @param {ColorizeOptions} colorizeOptions - the colorize options to set
   */
  setMapColorizeOptions(mapId: string, colorizeOptions: ColorizeOptions): void {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      webgl2WarpedMap.renderOptions.colorizeOptions = colorizeOptions
    }
  }

  /**
   * Reset the colorize options of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapColorizeOptions(mapId: string): void {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      webgl2WarpedMap.renderOptions.colorizeOptions = undefined
    }
  }

  /**
   * Get the grid options of the renderer
   *
   * @returns {(Partial<GridOptions> | undefined)}
   */
  getGridOptions(): Partial<GridOptions> | undefined {
    return this.renderOptions.gridOptions
  }

  /**
   * Set the grid options of the renderer
   *
   * @param {GridOptions} gridOptions - the grid options to set
   */
  setGridOptions(gridOptions: GridOptions): void {
    this.renderOptions.gridOptions = gridOptions
  }

  /**
   * Reset the grid options of the renderer
   */
  resetGridOptions(): void {
    this.renderOptions.gridOptions = undefined
  }

  /**
   * Get the grid options of a map
   *
   * @param {string} mapId - ID of the map
   * @returns {(Partial<GridOptions> | undefined)}
   */
  getMapGridOptions(mapId: string): Partial<GridOptions> | undefined {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      return webgl2WarpedMap.renderOptions.gridOptions
    }
  }

  /**
   * Set the grid options of a map
   *
   * @param {string} mapId - ID of the map
   * @param {GridOptions} gridOptions - the grid options to set
   */
  setMapGridOptions(mapId: string, gridOptions: GridOptions): void {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      webgl2WarpedMap.renderOptions.gridOptions = gridOptions
    }
  }

  /**
   * Reset the grid options of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapGridOptions(mapId: string): void {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      webgl2WarpedMap.renderOptions.gridOptions = undefined
    }
  }

  /**
   * Get the saturation of the renderer
   *
   * @returns {number}
   */
  getSaturation(): number {
    return this.saturation
  }

  /**
   * Set the saturation of the renderer
   *
   * 0 - grayscale, 1 - original colors
   *
   * @param saturation - the satuation to set
   */
  setSaturation(saturation: number): void {
    this.saturation = saturation
  }

  /**
   * Reset the satuation of the renderer
   */
  resetSaturation(): void {
    this.saturation = DEFAULT_SATURATION
  }

  /**
   * Get the saturation of a map
   *
   * @param {string} mapId - ID of the map
   * @returns {(number | undefined)}
   */
  getMapSaturation(mapId: string): number | undefined {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      return webgl2WarpedMap.saturation
    }
  }

  /**
   * Set the saturation of a map
   *
   * 0 - grayscale, 1 - original colors
   *
   * @param mapId - ID of the map
   * @param saturation - the saturation to set
   */
  setMapSaturation(mapId: string, saturation: number): void {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      webgl2WarpedMap.saturation = saturation
    }
  }

  /**
   * Reset the saturation of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapSaturation(mapId: string): void {
    const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webgl2WarpedMap) {
      webgl2WarpedMap.saturation = DEFAULT_SATURATION
    }
  }

  /**
   * Render the map for a given viewport.
   *
   * If no viewport is specified the current viewport is rerendered.
   * If no current viewport is known, a viewport is deduced based on the WarpedMapList and canvas width and hight.
   *
   * @param {Viewport} [viewport] - the viewport to render
   */
  render(viewport?: Viewport): void {
    if (this.disableRender) {
      return
    }

    this.viewport =
      viewport ||
      this.viewport ||
      Viewport.fromSizeAndMaps(
        [this.gl.canvas.width, this.gl.canvas.width],
        this.warpedMapList
      )

    // Not awaiting this, using events to trigger new render calls
    this.loadMissingImageInfosInViewport()

    // Don't fire throttled function unless it could result in something
    // Otherwise we have to wait for that cycle to finish before useful cycle can be started
    if (this.someImageInfosInViewport()) {
      this.throttledPrepareRenderInternal()
    }

    this.renderInternal()
  }

  clear() {
    this.warpedMapList.clear()
    this.mapsInViewport = new Set()
    this.mapsWithRequestedTilesForViewport = new Set()
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT)
    this.tileCache.clear()
  }

  cancelThrottledFunctions() {
    this.throttledPrepareRenderInternal.cancel()
    this.throttledChanged.cancel()
  }

  destroy() {
    this.cancelThrottledFunctions()

    for (const webgl2WarpedMap of this.warpedMapList.getWarpedMaps()) {
      this.removeEventListenersFromWebGL2WarpedMap(webgl2WarpedMap)
    }

    this.removeEventListeners()

    super.destroy()

    this.gl.deleteProgram(this.mapProgram)
    this.gl.deleteProgram(this.linesProgram)
    this.gl.deleteProgram(this.pointsProgram)
    // Can't delete context, see:
    // https://stackoverflow.com/questions/14970206/deleting-webgl-contexts
  }

  protected updateMapsForViewport(tiles: FetchableTile[]): {
    mapsEnteringViewport: string[]
    mapsLeavingViewport: string[]
  } {
    const { mapsEnteringViewport, mapsLeavingViewport } =
      super.updateMapsForViewport(tiles)

    for (const mapId of mapsEnteringViewport) {
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
      if (!webgl2WarpedMap) {
        break
      }

      if (!this.viewport) {
        break
      }

      webgl2WarpedMap.updateVertexBuffers(
        this.viewport.projectedGeoToClipTransform
      )
    }

    return { mapsEnteringViewport, mapsLeavingViewport }
  }

  private prepareRenderInternal(): void {
    this.requestFetchableTiles()
  }

  protected shouldRequestFetchableTiles(): boolean {
    // Returns whether requested tiles should be updated

    // Returns true when the viewport moved significantly
    // > to prevent updating requested tiles on minimal movements/
    // Returns true when the viewport didn't move at all
    // > since this function is called (possibly multiple times) during startup, without changes to the viewport
    // Returns false in other cases

    // TODO: this could be a problem if the viewport is quickly and continously moved
    // within the tolerance during initial loading.
    // Possible solution: adding a 'allrendered' event and listening to it.

    if (!this.viewport) {
      return false
    }
    if (this.animating) {
      return false
    }
    if (!this.previousSignificantViewport) {
      this.previousSignificantViewport = this.viewport
      return true
    } else {
      const rectangleSquaredDistances = []
      for (let i = 0; i < 4; i++) {
        rectangleSquaredDistances.push(
          squaredDistance(
            this.previousSignificantViewport.projectedGeoRectangle[i],
            this.viewport.projectedGeoRectangle[i]
          ) / Math.pow(this.viewport.projectedGeoPerViewportScale, 2)
        )
      }
      const maxSquaredDistance = Math.max(...rectangleSquaredDistances)
      if (maxSquaredDistance === 0) {
        return true
      }
      if (maxSquaredDistance > Math.pow(SIGNIFICANT_VIEWPORT_DISTANCE, 2)) {
        this.previousSignificantViewport = this.viewport
        return true
      } else {
        return false
      }
    }
  }

  protected shouldAnticipateInteraction() {
    // Get a map's overview tiles only for this render
    return true
  }

  private renderInternal(): void {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    if (RENDER_MAPS) {
      this.renderMapsInternal()
    }
    if (RENDER_LINES) {
      this.renderLinesInternal()
    }
    if (RENDER_POINTS) {
      this.renderPointsInternal()
    }
  }

  private renderMapsInternal(): void {
    if (!this.viewport) {
      return
    }

    this.setMapProgramUniforms()

    for (const mapId of this.mapsWithRequestedTilesForViewport) {
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!webgl2WarpedMap) {
        continue
      }

      this.setMapProgramRenderOptionsUniforms(
        this.renderOptions,
        webgl2WarpedMap.renderOptions
      )
      this.setMapProgramMapUniforms(webgl2WarpedMap)

      // Draw map
      const count = webgl2WarpedMap.resourceTrianglePoints.length
      const primitiveType = this.gl.TRIANGLES
      const offset = 0
      this.gl.bindVertexArray(webgl2WarpedMap.mapVao)
      this.gl.drawArrays(primitiveType, offset, count)
    }
  }

  private renderLinesInternal(): void {
    this.setLinesProgramUniforms()

    for (const mapId of this.mapsInViewport) {
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!webgl2WarpedMap) {
        continue
      }

      this.setLinesProgramMapUniforms(webgl2WarpedMap)

      // Draw lines for each map
      const count =
        webgl2WarpedMap.lineLayers.reduce(
          (accumulator: number, lineLayer) =>
            accumulator + lineLayer.projectedGeoLines.length,
          0
        ) * 6
      const primitiveType = this.gl.TRIANGLES
      const offset = 0
      this.gl.bindVertexArray(webgl2WarpedMap.linesVao)
      this.gl.drawArrays(primitiveType, offset, count)
    }
  }

  private renderPointsInternal(): void {
    this.setPointsProgramUniforms()

    for (const mapId of this.mapsInViewport) {
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!webgl2WarpedMap) {
        continue
      }

      this.setPointsProgramMapUniforms(webgl2WarpedMap)

      // Draw points for each map
      const count = webgl2WarpedMap.pointLayers.reduce(
        (accumulator: number, pointLayer) =>
          accumulator + pointLayer.projectedGeoPoints.length,
        0
      )
      const primitiveType = this.gl.POINTS
      const offset = 0
      this.gl.bindVertexArray(webgl2WarpedMap.pointsVao)
      this.gl.drawArrays(primitiveType, offset, count)
    }
  }

  private setMapProgramUniforms() {
    const program = this.mapProgram
    const gl = this.gl
    gl.useProgram(program)

    // Debug
    const debugLocation = gl.getUniformLocation(program, 'u_debug')
    gl.uniform1f(debugLocation, DEBUG ? 1 : 0)

    // Animation progress
    const animationProgressLocation = gl.getUniformLocation(
      program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)

    // Distortion colors
    // TODO: make these colors pickable
    const colorDistortion00 = gl.getUniformLocation(
      program,
      'u_colorDistortion00'
    )
    gl.uniform4f(colorDistortion00, ...hexToFractionalRgb(red), 1)

    const colorDistortion01 = gl.getUniformLocation(
      program,
      'u_colorDistortion01'
    )
    gl.uniform4f(colorDistortion01, ...hexToFractionalRgb(darkblue), 1)

    const colorDistortion1 = gl.getUniformLocation(
      program,
      'u_colorDistortion1'
    )
    gl.uniform4f(colorDistortion1, ...hexToFractionalRgb(green), 1)

    const colorDistortion2 = gl.getUniformLocation(
      program,
      'u_colorDistortion2'
    )
    gl.uniform4f(colorDistortion2, ...hexToFractionalRgb(yellow), 1)

    const colorDistortion3 = gl.getUniformLocation(
      program,
      'u_colorDistortion3'
    )
    gl.uniform4f(colorDistortion3, ...hexToFractionalRgb(red), 1)

    const colorGrid = gl.getUniformLocation(program, 'u_colorGrid')
    gl.uniform4f(colorGrid, ...hexToFractionalRgb(black), 1)
  }

  private setMapProgramRenderOptionsUniforms(
    layerRenderOptions: RenderOptions,
    mapRenderOptions: RenderOptions
  ) {
    const gl = this.gl
    const program = this.mapProgram
    gl.useProgram(program)

    const renderOptions: RenderOptions = {
      removeColorOptions: {
        color:
          mapRenderOptions.removeColorOptions?.color ||
          layerRenderOptions.removeColorOptions?.color,
        hardness: maxOfNumberOrUndefined(
          mapRenderOptions.removeColorOptions?.hardness,
          layerRenderOptions.removeColorOptions?.hardness
        ),
        threshold: maxOfNumberOrUndefined(
          mapRenderOptions.removeColorOptions?.threshold,
          layerRenderOptions.removeColorOptions?.threshold
        )
      },
      colorizeOptions: {
        ...layerRenderOptions.colorizeOptions,
        ...mapRenderOptions.colorizeOptions
      },
      gridOptions: {
        ...layerRenderOptions.gridOptions,
        ...mapRenderOptions.gridOptions
      }
    }

    // Remove color uniforms
    const removeColorOptionsColor = renderOptions.removeColorOptions?.color

    const removeColorLocation = gl.getUniformLocation(program, 'u_removeColor')
    gl.uniform1f(removeColorLocation, removeColorOptionsColor ? 1 : 0)

    if (removeColorOptionsColor) {
      const removeColorOptionsColorLocation = gl.getUniformLocation(
        program,
        'u_removeColorOptionsColor'
      )
      gl.uniform3fv(removeColorOptionsColorLocation, removeColorOptionsColor)

      const removeColorOptionsThresholdLocation = gl.getUniformLocation(
        program,
        'u_removeColorOptionsThreshold'
      )
      gl.uniform1f(
        removeColorOptionsThresholdLocation,
        renderOptions.removeColorOptions?.threshold ||
          DEFAULT_REMOVE_COLOR_THRESHOLD
      )

      const removeColorOptionsHardnessLocation = gl.getUniformLocation(
        program,
        'u_removeColorOptionsHardness'
      )
      gl.uniform1f(
        removeColorOptionsHardnessLocation,
        renderOptions.removeColorOptions?.hardness ||
          DEFAULT_REMOVE_COLOR_HARDNESS
      )
    }

    // Colorize uniforms
    const colorizeOptionsColor = renderOptions.colorizeOptions?.color

    const colorizeLocation = gl.getUniformLocation(program, 'u_colorize')
    gl.uniform1f(colorizeLocation, colorizeOptionsColor ? 1 : 0)

    if (colorizeOptionsColor) {
      const colorizeOptionsColorLocation = gl.getUniformLocation(
        program,
        'u_colorizeOptionsColor'
      )
      gl.uniform3fv(colorizeOptionsColorLocation, colorizeOptionsColor)
    }

    // Grid uniforms
    const gridOptionsGrid = renderOptions.gridOptions?.enabled

    const gridLocation = gl.getUniformLocation(program, 'u_grid')
    gl.uniform1f(gridLocation, gridOptionsGrid ? 1 : 0)
  }

  private setMapProgramMapUniforms(webgl2WarpedMap: WebGL2WarpedMap) {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.mapProgram
    gl.useProgram(program)

    // Render Transform
    const renderTransform = multiplyTransform(
      this.viewport.projectedGeoToClipTransform,
      webgl2WarpedMap.invertedRenderTransform
    )
    const renderTransformLocation = gl.getUniformLocation(
      program,
      'u_renderTransform'
    )
    gl.uniformMatrix4fv(
      renderTransformLocation,
      false,
      transformToMatrix4(renderTransform)
    )

    // Opacity
    const opacityLocation = gl.getUniformLocation(program, 'u_opacity')
    gl.uniform1f(opacityLocation, this.opacity * webgl2WarpedMap.opacity)

    // Saturation
    const saturationLocation = gl.getUniformLocation(program, 'u_saturation')
    gl.uniform1f(
      saturationLocation,
      this.saturation * webgl2WarpedMap.saturation
    )

    // Distortion
    const distortionLocation = gl.getUniformLocation(program, 'u_distortion')
    gl.uniform1f(distortionLocation, webgl2WarpedMap.distortionMeasure ? 1 : 0)

    const distortionOptionsDistortionMeasureLocation = gl.getUniformLocation(
      program,
      'u_distortionOptionsdistortionMeasure'
    )
    gl.uniform1i(
      distortionOptionsDistortionMeasureLocation,
      webgl2WarpedMap.distortionMeasure
        ? supportedDistortionMeasures.indexOf(webgl2WarpedMap.distortionMeasure)
        : 0
    )

    // Best scale factor
    const scaleFactorForViewportLocation = gl.getUniformLocation(
      program,
      'u_scaleFactorForViewport'
    )
    const scaleFactorForViewport = webgl2WarpedMap.tileZoomLevelForViewport
      ? webgl2WarpedMap.tileZoomLevelForViewport.scaleFactor
      : 1
    gl.uniform1i(scaleFactorForViewportLocation, scaleFactorForViewport)

    // Cached tiles texture array
    const cachedTilesTextureArrayLocation = gl.getUniformLocation(
      program,
      'u_cachedTilesTextureArray'
    )
    gl.uniform1i(cachedTilesTextureArrayLocation, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, webgl2WarpedMap.cachedTilesTextureArray)

    // Cached tiles resource origin points and dimensions texture
    const cachedTilesResourceOriginPointsAndDimensionsLocation =
      gl.getUniformLocation(
        program,
        'u_cachedTilesResourceOriginPointsAndDimensionsTexture'
      )
    gl.uniform1i(cachedTilesResourceOriginPointsAndDimensionsLocation, 1)
    gl.activeTexture(gl.TEXTURE1)

    gl.bindTexture(
      gl.TEXTURE_2D,
      webgl2WarpedMap.cachedTilesResourceOriginPointsAndDimensionsTexture
    )

    // Cached tiles scale factors texture
    const cachedTileScaleFactorsTextureLocation = gl.getUniformLocation(
      program,
      'u_cachedTilesScaleFactorsTexture'
    )
    gl.uniform1i(cachedTileScaleFactorsTextureLocation, 2)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(
      gl.TEXTURE_2D,
      webgl2WarpedMap.cachedTilesScaleFactorsTexture
    )
  }

  private setLinesProgramUniforms() {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.linesProgram
    gl.useProgram(program)

    // ViewportToClip Transform
    const viewportToClipTransformLocation = gl.getUniformLocation(
      program,
      'u_viewportToClipTransform'
    )
    gl.uniformMatrix4fv(
      viewportToClipTransformLocation,
      false,
      transformToMatrix4(this.viewport.viewportToClipTransform)
    )

    // clipToViewport Transform
    const clipToViewportTransformLocation = gl.getUniformLocation(
      program,
      'u_clipToViewportTransform'
    )
    gl.uniformMatrix4fv(
      clipToViewportTransformLocation,
      false,
      transformToMatrix4(invertTransform(this.viewport.viewportToClipTransform))
    )

    // Animation progress
    const animationProgressLocation = gl.getUniformLocation(
      program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)
  }

  private setLinesProgramMapUniforms(webgl2WarpedMap: WebGL2WarpedMap) {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.linesProgram
    gl.useProgram(program)

    // Render Transform
    const renderTransform = multiplyTransform(
      this.viewport.projectedGeoToClipTransform,
      webgl2WarpedMap.invertedRenderTransform
    )
    const renderTransformLocation = gl.getUniformLocation(
      program,
      'u_renderTransform'
    )
    gl.uniformMatrix4fv(
      renderTransformLocation,
      false,
      transformToMatrix4(renderTransform)
    )
  }

  private setPointsProgramUniforms() {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.pointsProgram
    gl.useProgram(program)

    // Animation progress
    const animationProgressLocation = gl.getUniformLocation(
      program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)
  }

  private setPointsProgramMapUniforms(webgl2WarpedMap: WebGL2WarpedMap) {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.pointsProgram
    gl.useProgram(program)

    // Render Transform
    const renderTransform = multiplyTransform(
      this.viewport.projectedGeoToClipTransform,
      webgl2WarpedMap.invertedRenderTransform
    )
    const renderTransformLocation = gl.getUniformLocation(
      program,
      'u_renderTransform'
    )
    gl.uniformMatrix4fv(
      renderTransformLocation,
      false,
      transformToMatrix4(renderTransform)
    )
  }

  private startTransformationTransition(mapIds: string[]) {
    for (const webgl2WarpedMap of this.warpedMapList.getWarpedMaps(mapIds)) {
      if (!this.viewport) {
        break
      }

      webgl2WarpedMap.updateVertexBuffers(
        this.viewport.projectedGeoToClipTransform
      )
    }

    if (this.lastAnimationFrameRequestId !== undefined) {
      cancelAnimationFrame(this.lastAnimationFrameRequestId)
    }

    this.animating = true
    this.transformationTransitionStart = undefined
    this.lastAnimationFrameRequestId = requestAnimationFrame(
      ((now: number) => this.transformationTransitionFrame(now, mapIds)).bind(
        this
      )
    )
  }

  private transformationTransitionFrame(now: number, mapIds: string[]) {
    if (!this.transformationTransitionStart) {
      this.transformationTransitionStart = now
    }

    if (now - this.transformationTransitionStart < ANIMATION_DURATION) {
      // Animation is ongoing
      // animationProgress goes from 0 to 1 throughout animation
      this.animationProgress =
        (now - this.transformationTransitionStart) / ANIMATION_DURATION

      this.renderInternal()

      this.lastAnimationFrameRequestId = requestAnimationFrame(
        ((now: number) => this.transformationTransitionFrame(now, mapIds)).bind(
          this
        )
      )
    } else {
      // Animation ended
      for (const webgl2WarpedMap of this.warpedMapList.getWarpedMaps(mapIds)) {
        webgl2WarpedMap.resetPrevious()

        if (!this.viewport) {
          break
        }

        webgl2WarpedMap.updateVertexBuffers(
          this.viewport.projectedGeoToClipTransform
        )
      }

      this.animating = false
      this.animationProgress = 0
      this.transformationTransitionStart = undefined

      this.changed()
    }
  }

  private changed() {
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
  }

  protected imageInfoLoaded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
    }
  }

  protected clearMap(mapId: string) {
    const webGL2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.clearTextures()
    }
  }

  protected mapTileLoaded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { mapId, tileUrl } = event.data as WarpedMapTileEventDetail
      const tile = this.tileCache.getCacheableTile(tileUrl)

      if (!tile) {
        return
      }

      if (!tile.isCachedTile()) {
        return
      }

      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
      if (!webgl2WarpedMap) {
        return
      }

      webgl2WarpedMap.addCachedTileAndUpdateTextures(tile)
    }
  }

  protected mapTileRemoved(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { mapId, tileUrl } = event.data as WarpedMapTileEventDetail
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!webgl2WarpedMap) {
        return
      }

      webgl2WarpedMap.removeCachedTileAndUpdateTextures(tileUrl)
    }
  }

  protected warpedMapAdded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
      if (webgl2WarpedMap) {
        this.addEventListenersToWebGL2WarpedMap(webgl2WarpedMap)
      }
    }
  }

  protected preChange(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapIds = event.data as string[]
      for (const webgl2WarpedMap of this.warpedMapList.getWarpedMaps(mapIds)) {
        if (this.animating) {
          webgl2WarpedMap.mixPreviousAndNew(1 - this.animationProgress)
        }
      }
    }
  }

  protected transformationChanged(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapIds = event.data as string[]
      this.startTransformationTransition(mapIds)
    }
  }

  protected distortionChanged(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapIds = event.data as string[]
      this.startTransformationTransition(mapIds)
    }
  }

  private addEventListenersToWebGL2WarpedMap(webgl2WarpedMap: WebGL2WarpedMap) {
    webgl2WarpedMap.addEventListener(
      WarpedMapEventType.TEXTURESUPDATED,
      this.throttledChanged.bind(this)
    )
  }

  private removeEventListenersFromWebGL2WarpedMap(
    webgl2WarpedMap: WebGL2WarpedMap
  ) {
    webgl2WarpedMap.removeEventListener(
      WarpedMapEventType.TEXTURESUPDATED,
      this.throttledChanged.bind(this)
    )
  }

  contextLost() {
    this.disableRender = true

    this.cancelThrottledFunctions()
    for (const webgl2WarpedMap of this.warpedMapList.getWarpedMaps()) {
      webgl2WarpedMap.cancelThrottledFunctions()
    }

    this.tileCache.clear()
  }

  contextRestored() {
    this.initializeWebGL(this.gl)

    this.disableRender = false
  }
}
