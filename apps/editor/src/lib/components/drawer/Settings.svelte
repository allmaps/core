<script lang="ts">
  import { fade } from 'svelte/transition'
  import { Select } from 'bits-ui'
  import { Check, CaretUpDown } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()

  let userGeoreferenceAnnotationUrl = $state(
    uiState.userGeoreferenceAnnotationUrl
  )

  let userBaseMapUrl = $state(uiState.userBaseMapUrl)

  function handleXyzTileUrlSubmit(event: Event) {
    event.preventDefault()

    if (userBaseMapUrl) {
      uiState.userBaseMapUrl = userBaseMapUrl
    }
  }

  function handleGeoreferenceAnnotationUrlSubmit(event: Event) {
    event.preventDefault()

    if (userGeoreferenceAnnotationUrl) {
      uiState.userGeoreferenceAnnotationUrl = userGeoreferenceAnnotationUrl
    }
  }
</script>

<div class="grid grid-cols-1 gap-2 [&>*]:break-all">
  <label for="select-basemap">Background map:</label>
  <Select.Root
    items={uiState.presetBaseMaps}
    selected={uiState.presetBaseMap}
    onSelectedChange={(selected) =>
      selected && (uiState.presetBaseMap = selected.value)}
  >
    <Select.Trigger
      id="select-basemap"
      class="inline-flex justify-between h-input px-2 py-1 items-center rounded-md border border-red bg-white text-sm transition-colors focus:outline-none focus:ring-2"
      aria-label="Select a base map"
    >
      <Select.Value class="text-sm" placeholder="Select a base map" />
      <CaretUpDown class="size-6" />
    </Select.Trigger>
    <Select.Content
      class="w-full rounded-xl border border-gray/80 bg-white px-1 py-1 shadow-lg outline-none z-50"
      transition={fade}
      transitionConfig={{ duration: 75 }}
      sideOffset={8}
    >
      {#each uiState.presetBaseMaps as presetBaseMap}
        <Select.Item
          class="flex h-10 w-full select-none items-center rounded-md py-3 pl-5 pr-1.5 text-sm outline-none transition-all duration-75 data-[highlighted]:bg-muted hover:bg-red cursor-pointer"
          value={presetBaseMap.value}
          label={presetBaseMap.label}
        >
          {presetBaseMap.label}
          <Select.ItemIndicator class="ml-auto" asChild={false}>
            <Check />
          </Select.ItemIndicator>
        </Select.Item>
      {/each}
    </Select.Content>
    <Select.Input name="select-basemap" />
  </Select.Root>

  <form class="contents" onsubmit={handleXyzTileUrlSubmit}>
    <label for="xyz-tile-url">Custom XYZ layer:</label>
    <div class="flex gap-2">
      <input
        bind:value={userBaseMapUrl}
        id="xyz-tile-url"
        type="text"
        autocomplete="off"
        placeholder="XYZ template URL"
        class="w-full border border-gray px-2 py-1 rounded-lg"
      />
      <button
        class="shrink-0 px-2 py-1 border border-gray rounded-md hover:bg-gray/10"
        type="submit">Load</button
      >
    </div>
  </form>

  <form class="contents" onsubmit={handleGeoreferenceAnnotationUrlSubmit}>
    <label for="georeference-annotation-url"
      >Custom Georeference Annotation:</label
    >
    <div class="flex gap-2">
      <input
        bind:value={userGeoreferenceAnnotationUrl}
        id="georeference-annotation-url"
        type="text"
        autocomplete="off"
        placeholder="URL of Georeference Annotation"
        class="w-full border border-gray px-2 py-1 rounded-lg"
      />
      <button
        class="shrink-0 px-2 py-1 border border-gray rounded-md hover:bg-gray/10"
        type="submit">Load</button
      >
    </div>
  </form>
</div>
