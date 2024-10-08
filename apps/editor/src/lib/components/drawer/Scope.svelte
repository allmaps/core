<script lang="ts">
  import { RadioGroup, Label } from 'bits-ui'

  import {
    Image as ImageIcon,
    Images as ImagesIcon,
    MapTrifold as MapTrifoldIcon
  } from 'phosphor-svelte'

  import { getScopeState } from '$lib/state/scope.svelte.js'

  const scopeState = getScopeState()
</script>

<div class="w-full flex flex-row justify-end items-center gap-2">
  <div>Show for:</div>
  <RadioGroup.Root
    bind:value={scopeState.scope}
    class="flex h-input justify-end items-center gap-1 rounded-sm "
  >
    {#if scopeState.hasImageScope}
      <RadioGroup.Item
        id="images"
        value="images"
        class="data-[state=checked]:bg-gray-100 hover:bg-gray-100 transition-all rounded-md"
      >
        <Label.Root
          for="images"
          class="cursor-pointer inline-flex gap-2 items-center px-2 py-1 justify-center"
          ><ImagesIcon class="size-6" /><span class="hidden sm:inline-block"
            >All images</span
          ></Label.Root
        ></RadioGroup.Item
      >
    {/if}
    <RadioGroup.Item
      id="image"
      value="image"
      class="data-[state=checked]:bg-gray-100 hover:bg-gray-100 transition-all rounded-md"
    >
      <Label.Root
        for="image"
        class="cursor-pointer inline-flex gap-2 items-center px-2 py-1 justify-center transition-all"
      >
        <ImageIcon class="size-6"><title>Current image</title></ImageIcon><span
          class="hidden sm:inline-block">Current image</span
        ></Label.Root
      >
    </RadioGroup.Item>

    <RadioGroup.Item
      id="map"
      value="map"
      class="data-[state=checked]:bg-gray-100 hover:bg-gray-100 transition-all rounded-md"
    >
      <Label.Root
        for="map"
        class="cursor-pointer inline-flex gap-2 items-center px-2 py-1 justify-center "
        ><MapTrifoldIcon class="size-6" /><span class="hidden sm:inline-block"
          >Current map</span
        ></Label.Root
      ></RadioGroup.Item
    >
  </RadioGroup.Root>
</div>
