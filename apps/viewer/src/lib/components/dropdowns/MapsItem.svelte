<script lang="ts">
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'

  import {
    setCustomResourceMask,
    resetCustomResourceMask
  } from '$lib/shared/stores/maps.js'
  import {
    selectMap,
    deselectMap,
    firstSelectedMapId
  } from '$lib/shared/stores/selected.js'
  import { showMap, hideMap } from '$lib/shared/stores/visible.js'
  import { view } from '$lib/shared/stores/view.js'
  import { mapWarpedMapLayer } from '$lib/shared/stores/openlayers.js'
  import { setActiveMapId } from '$lib/shared/stores/active.js'
  import { imageInformations } from '$lib/shared/stores/openlayers.js'
  import { setRenderOptionsForMap } from '$lib/shared/stores/render-options.js'
  import { getHue, fromHue } from '$lib/shared/color.js'

  import { fetchImageInfo, getFullResourceMask } from '@allmaps/stdlib'

  import {
    Thumbnail,
    Copy,
    Dial,
    BringMapsToFront,
    BringMapsForward,
    SendMapsBackward,
    SendMapsToBack
  } from '@allmaps/ui'

  import type { ViewerMap } from '$lib/shared/types.js'

  export let viewerMap: ViewerMap

  let container: HTMLElement

  let imageInfo: unknown | undefined

  const selected = writable(viewerMap.state.selected)
  const visible = writable(viewerMap.state.visible)
  const useMask = writable(viewerMap.state.customResourceMask ? false : true)

  // TODO: create function in stores/opacity.ts that creates opacity
  // for map opacity
  const opacity = writable(viewerMap.opacity)

  const colorize = writable(viewerMap.renderOptions.colorize.enabled)

  const colorizeColor = viewerMap.renderOptions.colorize.color
  let hueInitialized = false
  const hue = colorizeColor
    ? writable(getHue(colorizeColor) / 360)
    : writable(0)

  const mapId = viewerMap.mapId
  const imageUri = viewerMap.map.resource.id
  const warpedMap = mapWarpedMapLayer.getWarpedMap(mapId)

  const checkboxId = `dropdown-maps-${mapId}`

  const imageWidth = viewerMap.map.resource.width
  const imageHeight = viewerMap.map.resource.height

  $: {
    $hue
    if (hueInitialized) {
      $colorize = true
    }

    hueInitialized = true
  }

  $: {
    setRenderOptionsForMap(mapId, {
      colorize: {
        enabled: $colorize,
        color: fromHue($hue * 360)
      }
    })
  }

  // TODO: the fullResourceMask is available directly in WarpedMap class!
  // This also means this function can be removed from stdlib.
  const fullResourceMask = getFullResourceMask(imageWidth, imageHeight)

  selected.subscribe(($selected) => {
    if ($selected) {
      selectMap(mapId)
    } else {
      deselectMap(mapId)
    }
  })

  visible.subscribe(($visible) => {
    if ($visible) {
      showMap(mapId)
    } else {
      hideMap(mapId)
    }
  })

  useMask.subscribe(($useMask) => {
    if ($useMask) {
      resetCustomResourceMask(mapId)
    } else {
      setCustomResourceMask(mapId, fullResourceMask)
    }
  })

  opacity.subscribe(($opacity) => {
    mapWarpedMapLayer.setMapOpacity(mapId, $opacity)
  })

  function resourceMaskToPoints(
    resourceMask: [number, number][],
    viewBox: [number, number]
  ): string {
    const maxViewBoxDimension = Math.max(viewBox[0], viewBox[1])
    const maxImageDimension = Math.max(imageWidth, imageHeight)

    const scale = maxViewBoxDimension / maxImageDimension
    const translate = [
      imageWidth < imageHeight ? ((imageHeight - imageWidth) / 2) * scale : 0,
      imageWidth < imageHeight ? 0 : ((imageWidth - imageHeight) / 2) * scale
    ]

    const transformPoint = (point: [number, number]) => [
      point[0] * scale + translate[0],
      point[1] * scale + translate[1]
    ]

    return resourceMask
      .map((point) => transformPoint(point).join(','))
      .join(' ')
  }

  function handleShowOnMap() {
    setActiveMapId(viewerMap.mapId, true)
    $view = 'map'
  }

  function handleShowImage() {
    setActiveMapId(viewerMap.mapId, true)
    $view = 'image'
  }

  function handleBringMapsToFront() {
    mapWarpedMapLayer.bringMapsToFront([mapId])
  }

  function handleBringMapsForward() {
    mapWarpedMapLayer.bringMapsForward([mapId])
  }

  function handleSendMapsBackward() {
    mapWarpedMapLayer.sendMapsBackward([mapId])
  }

  function handleSendMapsToBack() {
    mapWarpedMapLayer.sendMapsToBack([mapId])
  }

  onMount(async () => {
    if ($firstSelectedMapId === mapId) {
      container.scrollIntoView()
    }

    // TODO: move to function
    if (imageInformations.has(imageUri)) {
      imageInfo = imageInformations.get(imageUri)
    } else {
      imageInfo = await fetchImageInfo(imageUri, { cache: 'force-cache' })
      imageInformations.set(imageUri, imageInfo)
    }
  })
</script>

<div
  bind:this={container}
  class="grid gap-4 grid-cols-[auto_1fr] grid-rows-[auto_auto] w-full"
>
  <div>
    <input
      type="checkbox"
      id={checkboxId}
      bind:checked={$selected}
      class="hidden peer"
    />
    <label
      for={checkboxId}
      class="relative inline-block w-48 h-48 p-2 text-gray-500 bg-white border-2 border-gray-200 rounded cursor-pointer peer-checked:border-blue-600 hover:text-gray-600 peer-checked:text-gray-600 hover:bg-gray-50 select-none"
    >
      <div
        class="relative inline-flex items-center justify-between w-full h-full transition-opacity"
        class:opacity-50={!$visible}
      >
        <div class="absolute block object-fill">
          {#if viewerMap && imageInfo !== undefined}
            <Thumbnail {imageInfo} width={192} height={192} mode="contain" />
          {/if}
          <svg class="absolute w-full h-full inset-0" viewBox="0 0 100 100">
            <polygon
              points={resourceMaskToPoints(
                $useMask ? viewerMap.map.resourceMask : fullResourceMask,
                [100, 100]
              )}
              class="fill-none stroke-2"
              style={`stroke: #FF56BA;`}
            />
          </svg>
        </div>
      </div>
    </label>
  </div>

  <div class="flex flex-col gap-4 justify-between w-full">
    <!-- 2 -->

    <div>
      <span>Map {viewerMap.index + 1}</span>
    </div>
    <div class="flex flex-row justify-between items-center">
      <div class="inline-flex flex-row gap-4">
        <div class="inline-flex items-center">
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              bind:checked={$visible}
              class="sr-only peer"
            />
            <div
              class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
            ></div>
            <span class="ml-3 text-sm font-medium text-gray-900">Visible</span>
          </label>
        </div>
        <div class="inline-flex items-center">
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              bind:checked={$useMask}
              class="sr-only peer"
            />
            <div
              class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
            ></div>
            <span class="ml-3 text-sm font-medium text-gray-900">Use mask</span>
          </label>
        </div>
        <div class="inline-flex items-center">
          <div class="inline-flex items-center">
            <Dial
              bind:value={$hue}
              label="Colorize"
              toggle={false}
              clamp={false}
              showDial={false}
              distanceValueRatio={1 / 250}
              enableTooltip={false}
            >
              <div
                class="w-full h-full rounded-full"
                class:opacity-50={!$colorize}
                style={`background: hsl(${$hue * 360}, 100%, 50%);`}
              ></div>
            </Dial>
          </div>

          <label class="relative ml-3 inline-flex items-center cursor-pointer">
            <div>
              <input
                type="checkbox"
                bind:checked={$colorize}
                class="sr-only peer"
              />
              <div
                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
              ></div>
            </div>

            <span class="ml-3 text-sm font-medium text-gray-900">Colorize</span>
          </label>
        </div>

        <div>
          <!-- eslint-expect-error-next-line -->
          <label class="relative inline-flex items-center cursor-pointer">
            <Dial
              bind:value={$opacity}
              label="Opacity"
              toggle={false}
              enableTooltip={false}
            />
            <span class="ml-3 text-sm font-medium text-gray-900">Opacity</span>
          </label>
        </div>
      </div>

      <div class="inline-flex rounded-md shadow-sm" role="group">
        <button
          type="button"
          title="Bring To Front"
          on:click={handleBringMapsToFront}
          class="p-1.5 w-8 h-8 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
        >
          <BringMapsToFront />
        </button>
        <button
          type="button"
          title="Bring Forward"
          on:click={handleBringMapsForward}
          class="p-1.5 w-8 h-8 bg-white border-t border-b border-r border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
        >
          <BringMapsForward />
        </button>
        <button
          type="button"
          title="Send Backward"
          on:click={handleSendMapsBackward}
          class="p-1.5 w-8 h-8 bg-white border-t border-b border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
        >
          <SendMapsBackward />
        </button>
        <button
          type="button"
          title="Send to Back"
          on:click={handleSendMapsToBack}
          class="p-1.5 w-8 h-8 bg-white border border-gray-200 rounded-r-md hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
        >
          <SendMapsToBack />
        </button>
      </div>
    </div>

    <div class="grid gap-4 grid-cols-[auto_1fr] grid-rows-[auto_auto] w-full">
      <div class="py-1">Georeference Annotation:</div>

      <div class="flex flex-col items-end gap-4">
        <Copy string={JSON.stringify(viewerMap.annotation, null, 2)} />

        <div>
          Open in:
          <a class="underline" target="_blank" rel="noreferrer" href={mapId}
            >new tab</a
          >,

          {#if warpedMap?.geoMask}
            <a
              class="underline"
              target="_blank"
              rel="noreferrer"
              href="http://geojson.io/#data=data:application/json,{encodeURIComponent(
                JSON.stringify(warpedMap.geoMask)
              )}">geojson.io</a
            >,
          {/if}

          <a
            class="underline"
            target="_blank"
            rel="noreferrer"
            href="https://editor.allmaps.org/#/collection?url={imageUri}/info.json"
            >Allmaps Editor</a
          >
        </div>
      </div>
      <div class="py-1">XYZ tile URL:</div>
      <!-- TODO: create functions for IDs/URNs in stdlib -->
      <Copy
        string={`https://allmaps.xyz/maps/${mapId.split('/').at(-1)}/{z}/{x}/{y}.png`}
      />
    </div>
  </div>

  <div>
    <!-- 3 -->
    <div>
      <button
        type="button"
        title="Show on map"
        on:click={handleShowOnMap}
        class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2"
        >Map</button
      >
      <button
        type="button"
        title="Show image"
        on:click={handleShowImage}
        class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2"
        >Image</button
      >
    </div>
  </div>

  <div>
    <!-- 4 -->
  </div>
</div>
