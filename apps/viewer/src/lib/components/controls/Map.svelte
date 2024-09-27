<script lang="ts">
  import { onMount } from 'svelte'

  import { ol } from '$lib/shared/stores/openlayers.js'
  import experimentalFeatures from '$lib/shared/experimental-features.js'

  import type Map from 'ol/Map.js'
  import Zoom from 'ol/control/Zoom.js'
  import Rotate from 'ol/control/Rotate.js'

  import Transformation from '$lib/components/controls/Transformation.svelte'

  let zoom: Zoom
  let rotate: Rotate

  let container: HTMLElement

  const classes = [
    'inline-flex',
    'items-center',
    'w-9',
    'h-9',
    'bg-white',
    'border',
    'border-gray-200',
    'hover:bg-gray-100',
    'text-center',
    'inline-flex',
    'items-center',
    'justify-center',
    'relative',
    'focus:z-50',
    'focus:ring',
    'focus:ring-pink-200'
  ]

  let rotateButtonMouseMoveStartX: number

  function handleRotateButtonMove(event: Event) {
    let diffX: number | undefined

    if (window.TouchEvent && event instanceof TouchEvent) {
      diffX = event.touches[0].screenX - rotateButtonMouseMoveStartX
    } else if (event instanceof MouseEvent) {
      diffX = event.screenX - rotateButtonMouseMoveStartX
    }

    if ($ol && diffX !== undefined) {
      $ol.getView().setRotation(diffX / 100)
    }
  }

  $: {
    if ($ol) {
      createControls($ol)
    }
  }

  function createControls($ol: Map) {
    if (zoom) {
      zoom.setMap($ol)
    }

    if (rotate) {
      rotate.setMap($ol)
    }
  }

  onMount(() => {
    zoom = new Zoom({
      target: container
    })

    rotate = new Rotate({
      target: container
    })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const zoomContainer = zoom.element

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const rotateContainer = rotate.element

    zoomContainer.classList.remove('ol-control')
    rotateContainer.classList.remove('ol-control')

    const zoomIn = zoomContainer.querySelector('.ol-zoom-in')
    if (zoomIn) {
      zoomIn.classList.remove('ol-zoom-in')
      zoomIn.classList.add(...classes, 'rounded-l-lg')
    }
    const zoomOut = zoomContainer.querySelector('.ol-zoom-out')
    if (zoomOut) {
      zoomOut.classList.remove('ol-zoom-out')
      zoomOut.classList.add(...classes)
    }

    const rotateButton = rotateContainer.querySelector('.ol-rotate-reset')
    if (rotateButton) {
      rotateButton.classList.add(...classes, 'rounded-r-lg')
      rotateButton.addEventListener('mousedown', (event: Event) => {
        if (event instanceof MouseEvent) {
          rotateButtonMouseMoveStartX = event.screenX
          window.addEventListener('mousemove', handleRotateButtonMove)
          window.addEventListener('mouseup', () => {
            window.removeEventListener('mousemove', handleRotateButtonMove)
          })
          event.preventDefault()
        }
      })
      rotateButton.addEventListener(
        'touchstart',
        (event: Event) => {
          if (event instanceof TouchEvent) {
            rotateButtonMouseMoveStartX = event.touches[0].screenX
            window.addEventListener('touchmove', handleRotateButtonMove)
            window.addEventListener('touchend', () => {
              window.removeEventListener('touchmove', handleRotateButtonMove)
            })
            event.preventDefault()
          }
        },
        {
          passive: true
        }
      )
    }

    if ($ol) {
      createControls($ol)
    }
  })
</script>

<div class="inline-flex gap-1">
  <div
    bind:this={container}
    class="inline-flex rounded-md shadow-sm"
    role="group"
  ></div>
  {#if experimentalFeatures}
    <Transformation />
  {/if}
</div>
<!-- <div class="select-container">
  <div class="select">
    <select bind:value={tileSourceIndex}>
      <option value={0}>Map</option>
      <option value={2}>Satellite</option>
    </select>
  </div>
</div> -->
