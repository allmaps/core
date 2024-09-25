<script lang="ts">
  import { RadioGroup, Label } from 'bits-ui'

  import { getScopeState } from '$lib/state/scope.svelte.js'

  const scopeState = getScopeState()
</script>

<RadioGroup.Root
  bind:value={scopeState.scope}
  class="flex h-input justify-end items-center gap-x-0.5 rounded-sm px-[4px] py-1"
>
  <RadioGroup.Item
    id="images"
    value="images"
    class="data-[state=checked]:bg-gray-100 hover:bg-gray-100 transition-all rounded-md"
  >
    <Label.Root
      for="images"
      class="cursor-pointer inline-flex items-center px-2 py-1 justify-center"
      >All images</Label.Root
    ></RadioGroup.Item
  >

  <RadioGroup.Item
    id="image"
    value="image"
    class="data-[state=checked]:bg-gray-100 hover:bg-gray-100 transition-all rounded-md"
  >
    <Label.Root
      for="image"
      class="cursor-pointer inline-flex items-center px-2 py-1 justify-center transition-all"
      >Current image</Label.Root
    >
  </RadioGroup.Item>

  <RadioGroup.Item
    id="map"
    value="map"
    class="data-[state=checked]:bg-gray-100 hover:bg-gray-100 transition-all rounded-md"
  >
    <Label.Root
      for="map"
      class="cursor-pointer inline-flex items-center px-2 py-1 justify-center "
      >Current map</Label.Root
    ></RadioGroup.Item
  >
</RadioGroup.Root>
