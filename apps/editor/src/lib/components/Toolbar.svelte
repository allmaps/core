<script lang="ts">
  import { DropdownMenu } from 'bits-ui'

  import {
    Cloud as CloudIcon,
    // CloudSlash
    DotsThree as DotsThreeIcon
  } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { flyAndScale } from '$lib/shared/transitions.js'

  const uiState = getUiState()

  function handleMenuItemClick(event: Event) {
    uiState.showAboutDialog = true
    event.preventDefault()
  }
</script>

<button
  class="cloud hidden shrink-0 hover:underline text-sm md:flex gap-1"
  onclick={handleMenuItemClick}
  ><CloudIcon class="size-5" weight="duotone" /><span
    >All edits are automatically saved</span
  ></button
>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class="focus-visible p-1 inline-flex items-center justify-center rounded-full hover:bg-gray/20 transition-colors"
  >
    <DotsThreeIcon class="h-6 w-6 text-foreground" />
  </DropdownMenu.Trigger>
  <DropdownMenu.Content
    class="z-50 w-full max-w-[229px] rounded-xl border border-gray/10 bg-white px-1 py-1.5 shadow-md"
    transition={flyAndScale}
    sideOffset={8}
  >
    <DropdownMenu.Item
      onclick={handleMenuItemClick}
      class="flex h-10 select-none items-center rounded-md py-3 pl-3 pr-1.5 text-sm font-medium !ring-0 !ring-transparent data-[highlighted]:bg-muted hover:bg-pink hover:text-white"
    >
      About Allmaps Editor
    </DropdownMenu.Item>
    <DropdownMenu.Item
      onclick={handleMenuItemClick}
      class="flex h-10 select-none items-center rounded-md py-3 pl-3 pr-1.5 text-sm font-medium !ring-0 !ring-transparent data-[highlighted]:bg-muted hover:bg-pink hover:text-white"
    >
      Terms of use
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

<style>
  :global(.cloud path:first-of-type) {
    opacity: 0;
    transition: all 0.5s;
  }

  :global(.cloud:hover path:first-of-type) {
    opacity: 0.5;
    fill: pink;
  }
</style>
