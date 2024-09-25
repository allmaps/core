<script lang="ts">
  import { ToggleGroup } from 'bits-ui'

  import {
    Info as InfoIcon,
    ListBullets as ListBulletsIcon,
    Code as CodeIcon,
    Export as ExportIcon,
    Gear as GearIcon
  } from 'phosphor-svelte'

  import Info from '$lib/components/drawer/Info.svelte'
  import Maps from '$lib/components/drawer/Maps.svelte'
  import Annotation from '$lib/components/drawer/Annotation.svelte'
  import Export from '$lib/components/drawer/Export.svelte'
  import Settings from '$lib/components/drawer/Settings.svelte'

  import SourceLabel from '$lib/components/SourceLabel.svelte'

  const drawers = {
    info: Info,
    maps: Maps,
    annotation: Annotation,
    export: Export,
    settings: Settings
  }

  let value:
    | 'info'
    | 'maps'
    | 'annotation'
    | 'export'
    | 'settings'
    | undefined = $state()

  const Drawer = $derived(value && drawers[value])
</script>

<div
  class="max-w-screen-sm bg-white rounded-md p-2 gap-2 flex flex-col min-w-0"
>
  {#if value}
    <div class="rounded-md shadow-inner overflow-hidden">
      <Drawer />
    </div>
  {/if}

  <div class="flex gap-2 items-center justify-end">
    <ToggleGroup.Root
      bind:value
      type="single"
      class="flex gap-1 justify-end items-center min-w-0"
    >
      <ToggleGroup.Item
        aria-label="toggle bold"
        value="info"
        class="flex flex-row gap-4 items-center min-w-0"
      >
        <SourceLabel />
        <div
          class="rounded-full p-1 transition-all border-solid border-gray/50 border-2 data-[state=on]:border-pink hover:border-pink/50 hover:bg-pink/20"
        >
          <InfoIcon size={24} class="block" weight="bold" />
        </div>
      </ToggleGroup.Item>
      <ToggleGroup.Item
        aria-label="toggle italic"
        value="maps"
        class="rounded-full p-1 transition-all border-solid border-gray/50 border-2 data-[state=on]:border-pink hover:border-pink/50 hover:bg-pink/20"
      >
        <ListBulletsIcon size={24} class="block" weight="bold" />
      </ToggleGroup.Item>
      <ToggleGroup.Item
        aria-label="show Georeference Annotation"
        title="Show Georeference Annotation"
        value="annotation"
        class="rounded-full p-1 transition-all border-solid border-gray/50 border-2 data-[state=on]:border-pink hover:border-pink/50 hover:bg-pink/20"
      >
        <CodeIcon size={24} class="block" weight="bold" />
      </ToggleGroup.Item>
      <ToggleGroup.Item
        aria-label="export options"
        title="Export options"
        value="export"
        class="rounded-full p-1 transition-all border-solid border-gray/50 border-2 data-[state=on]:border-pink hover:border-pink/50 hover:bg-pink/20"
      >
        <ExportIcon size={24} class="block" weight="bold" />
      </ToggleGroup.Item>
      <ToggleGroup.Item
        aria-label="toggle strikethrough"
        value="settings"
        class="rounded-full p-1 transition-all border-solid border-gray/50 border-2 data-[state=on]:border-pink hover:border-pink/50 hover:bg-pink/20"
      >
        <GearIcon size={24} class="block" weight="bold" />
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  </div>
</div>
