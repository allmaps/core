<script lang="ts">
  import { Image, type ImageRequest } from '@allmaps/iiif-parser'

  import type { Fit } from '@allmaps/types'

  export let imageInfo: unknown
  export let width: number
  export let height = width
  export let mode: Fit = 'cover'
  export let alt: string | undefined = undefined

  let imageRequest: ImageRequest | ImageRequest[][] | undefined = undefined

  let parsedImage: Image

  function getTilesWidth(imageRequestGrid: ImageRequest[][]) {
    const firstRow = imageRequestGrid[0]
    return firstRow.reduce((acc, row) => acc + (row.size?.width || 0), 0)
  }

  function getTilesHeight(imageRequestGrid: ImageRequest[][]) {
    return imageRequestGrid.reduce(
      (acc, cells) => acc + (cells[0].size?.height || 0),
      0
    )
  }

  function getColumnPercentages(
    imageRequestGrid: ImageRequest[][],
    tilesWidth: number
  ) {
    const firstRow = imageRequestGrid[0]
    if (tilesWidth === 0) {
      return new Array(firstRow.length).fill(0)
    }

    return firstRow.map((row) => ((row.size?.width || 0) / tilesWidth) * 100)
  }

  function getLeftStyle(tilesWidth: number, tilesHeight: number) {
    return `${(100 - (tilesWidth / tilesHeight) * 100) / 2}%`
  }

  function getTopStyle(tilesWidth: number, tilesHeight: number) {
    return `${(100 - (tilesHeight / tilesWidth) * 100) / 2}%`
  }

  $: parsedImage = Image.parse(imageInfo)
  $: imageRequest = parsedImage.getThumbnail({ width, height }, mode)
</script>

<div style:aspect-ratio="{width} / {height}" class="overflow-hidden">
  {#if imageRequest && !Array.isArray(imageRequest)}
    <img
      class="w-full h-full {mode === 'cover'
        ? 'object-cover'
        : 'object-contain'}"
      alt={alt || `Thumbnail for ${parsedImage.uri}`}
      src={parsedImage.getImageUrl(imageRequest)}
    />
  {:else if imageRequest && Array.isArray(imageRequest)}
    {@const tilesWidth = getTilesWidth(imageRequest)}
    {@const tilesHeight = getTilesHeight(imageRequest)}

    <div
      class="relative grid"
      class:w-full={mode === 'contain'}
      class:h-full={mode === 'cover'}
      style:grid-template-columns={getColumnPercentages(
        imageRequest,
        tilesWidth
      )
        .map((percentage) => `${percentage}%`)
        .join(' ')}
      style:aspect-ratio="{tilesWidth} / {tilesHeight}"
      style:left={mode === 'cover' ? getLeftStyle(tilesWidth, tilesHeight) : ''}
      style:top={mode === 'contain' ? getTopStyle(tilesWidth, tilesHeight) : ''}
    >
      {#each imageRequest as row, rowIndex}
        {#each row as tile, columnIndex}
          <img
            class="h-auto max-w-full"
            src={parsedImage.getImageUrl(tile)}
            alt={alt ||
              `Thumbnail for ${parsedImage.uri} (${rowIndex}, ${columnIndex})`}
          />
        {/each}
      {/each}
    </div>
  {/if}
</div>
