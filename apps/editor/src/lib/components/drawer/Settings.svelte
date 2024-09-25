<script lang="ts">
  import { fade } from 'svelte/transition'
  import { Select } from 'bits-ui'
  import { Check, CaretUpDown } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()
</script>

<Select.Root
  items={uiState.presetBaseMaps}
  selected={uiState.presetBaseMap}
  onSelectedChange={(selected) =>
    selected && (uiState.presetBaseMap = selected.value)}
>
  <Select.Trigger
    class="inline-flex h-input w-[296px] items-center rounded-9px border border-border-input bg-white px-[11px] text-sm transition-colors placeholder:text-foreground-alt/50  focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
    aria-label="Select a theme"
  >
    <Select.Value class="text-sm" placeholder="Select a base map" />
    <CaretUpDown class="size-6" />
  </Select.Trigger>
  <Select.Content
    class="w-full rounded-xl border border-muted bg-white px-1 py-3 shadow-popover outline-none"
    transition={fade}
    sideOffset={8}
  >
    {#each uiState.presetBaseMaps as presetBaseMap}
      <Select.Item
        class="flex h-10 w-full select-none items-center rounded-button py-3 pl-5 pr-1.5 text-sm outline-none transition-all duration-75 data-[highlighted]:bg-muted"
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
  <Select.Input name="favoriteFruit" />
</Select.Root>

<div>
  <input type="text" />
  input with custom xyz layer
</div>

<div>
  <input type="text" />
  input with custom georeference annotation
</div>
