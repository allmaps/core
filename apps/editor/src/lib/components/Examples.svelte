<script lang="ts">
  import { Loading, Collection, Thumbnail } from '@allmaps/ui'

  import { Pagination, Tooltip } from 'bits-ui'

  import {
    CaretLeft as CaretLeftIcon,
    CaretRight as CaretRightIcon
  } from 'phosphor-svelte'

  import { flyAndScale } from '$lib/shared/transitions.js'

  import { getExamplesState } from '$lib/state/examples.svelte.js'
  import { getImageInfoState } from '$lib/state/image-info.svelte.js'

  const examplesState = getExamplesState()
  const imageInfoState = getImageInfoState()

  const perPage = 30

  const maxPopupTextLength = 125

  function truncate(text: string) {
    return text.length > maxPopupTextLength
      ? `${text.slice(0, maxPopupTextLength)}…`
      : text
  }
</script>

{#if examplesState.loading}
  <div class="w-full h-[50vh] flex flex-col items-center justify-center">
    <Loading />
    <div>Loading examples</div>
  </div>
{:else}
  <Pagination.Root
    count={examplesState.examples.length}
    bind:page={examplesState.page}
    {perPage}
    let:pages
    let:range
  >
    {@const page = examplesState.examples.slice(range.start, range.end)}
    <Collection>
      {#each page as example (example.imageId)}
        {#await imageInfoState.fetchImageInfo(example.imageId.replace('/info.json', ''))}
          <div class="w-full aspect-square">
            <p>Loading…</p>
          </div>
        {:then imageInfo}
          <Tooltip.Root openDelay={0}>
            <Tooltip.Trigger class="w-full">
              <a
                href={`/images?url=${example.manifestId}`}
                class="inline-block rounded-md relative overflow-hidden"
              >
                <Thumbnail {imageInfo} width={300} alt={example.title} />
                <span
                  class="absolute text-left w-full p-2 left-0 bottom-0 truncate [text-shadow:_1px_1px_3px_#fff]"
                  >{example.title}</span
                >
              </a>
            </Tooltip.Trigger>
            <Tooltip.Content
              transition={flyAndScale}
              transitionConfig={{ y: 8, duration: 150 }}
              side="bottom"
              sideOffset={8}
            >
              <div class="bg-white">
                <Tooltip.Arrow
                  class="rounded-sm border-l border-t border-gray-100"
                />
              </div>
              <div
                class="flex items-center justify-center max-w-64 rounded-lg border border-gray-100 bg-white p-3 text-sm font-medium shadow-xl outline-none"
              >
                {truncate(example.title)}
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        {/await}
      {/each}
    </Collection>
    <div class="my-8 flex items-center justify-center">
      <Pagination.PrevButton
        class="mr-[25px] inline-flex size-10 items-center justify-center rounded-[9px] bg-transparent hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-muted-foreground hover:disabled:bg-transparent"
      >
        <CaretLeftIcon class="size-6" />
      </Pagination.PrevButton>
      <div class="flex items-center gap-2.5">
        {#each pages as page (page.key)}
          {#if page.type === 'ellipsis'}
            <div class="text-[15px] font-medium text-foreground-alt">...</div>
          {:else}
            <Pagination.Page
              {page}
              class="inline-flex size-10 items-center justify-center rounded-[9px] bg-transparent text-[15px] font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 hover:disabled:bg-transparent data-[selected]:bg-gray-100 data-[selected]:text-background"
            >
              {page.value}
            </Pagination.Page>
          {/if}
        {/each}
      </div>
      <Pagination.NextButton
        class="ml-[29px] inline-flex size-10 items-center justify-center rounded-[9px] bg-transparent hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-muted-foreground hover:disabled:bg-transparent"
      >
        <CaretRightIcon class="size-6" />
      </Pagination.NextButton>
    </div>
    <p class="text-center text-[13px] text-muted-foreground">
      Showing {range.start} - {range.end}
    </p>
  </Pagination.Root>
{/if}
