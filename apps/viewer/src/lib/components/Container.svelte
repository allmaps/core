<script lang="ts">
  import { view } from '$lib/shared/stores/view.js'
  import { error } from '$lib/shared/stores/error.js'
  import { mapCount } from '$lib/shared/stores/maps.js'

  import MapView from '$lib/components/views/Map.svelte'
  import ListView from '$lib/components/views/List.svelte'
  import ImageView from '$lib/components/views/Image.svelte'

  import MapControl from '$lib/components/controls/Map.svelte'
  import ViewControl from '$lib/components/controls/View.svelte'
  import PathControl from '$lib/components/controls/Path.svelte'
  import DialsControl from '$lib/components/controls/Dials.svelte'
  import SelectionControl from '$lib/components/controls/Selection.svelte'

  import Error from '$lib/components/elements/Error.svelte'
</script>

{#if $error}
  <div class="container mx-auto">
    <Error error={$error} />
  </div>
{:else if $mapCount === 0}
  <!-- TODO: -->
  <!-- <div>EMPTY!</div> -->
{:else}
  <div class="w-full h-full relative flex flex-col">
    {#if $view === 'map'}
      <MapView />
    {:else if $view === 'list'}
      <ListView />
    {:else}
      <ImageView />
    {/if}
    <div
      class="pointer-events-none absolute top-0 w-full h-full p-2 grid grid-cols-3 grid-rows-2"
    >
      <div>
        {#if $view !== 'list'}
          <div class="pointer-events-auto inline">
            <MapControl />
          </div>
        {/if}
      </div>
      <div></div>
      <div class="justify-self-end">
        <div class="pointer-events-auto inline">
          <ViewControl />
        </div>
      </div>
      <div class="self-end">
        {#if $view !== 'list'}
          <div class="pointer-events-auto inline">
            <PathControl />
          </div>
        {/if}
      </div>
      <div class="justify-self-center self-end">
        {#if $view === 'map'}
          <div class="pointer-events-auto inline">
            <DialsControl />
          </div>
        {/if}
      </div>
      <div class="justify-self-end self-end">
        {#if $view !== 'list' && $mapCount > 1}
          <div class="pointer-events-auto inline">
            <SelectionControl />
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
