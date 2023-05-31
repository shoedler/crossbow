<script lang="ts">
  import { getIcon } from 'obsidian';
  import type { ITreeVisualizable } from '../treeItem';

  type TData = $$Generic<ITreeVisualizable>;

  export let collapsed = true;
  export const data: TData = $$props.data;
  export const collapseIcon = getIcon('right-triangle') ?? new SVGElement();
</script>

<div class="tree-item {collapsed ? 'is-collapsed' : ''}">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div on:click={() => (collapsed = !collapsed)} class="tree-item-self is-clickable mod-collapsible">
    {#if data.children.length > 0}
      <div class="tree-item-icon collapse-icon">
        {@html collapseIcon}
      </div>
    {/if}

    <div class="tree-item-inner cb-tree-item-inner-extensions">
      {data.text}

      {#if data.textSuffix}
        <span class="cb-tree-item-inner-suffix">
          ({data.textSuffix})
        </span>
      {/if}

      {#if data.subtitleText}
        <span class="cb-tree-item-inner-subtitle">
          {data.subtitleText}
        </span>
      {/if}
    </div>

    {#if data.textSuffix}
      <div class="tree-item-flair-outer">
        <span class="tree-item-flair">
          {data.textSuffix}
        </span>
      </div>
    {/if}

    <button aria-label="Scroll into View" class="cb-tree-item-button">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="svg-icon lucide-scroll"
      >
        <path d="M10 17v2a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v3h3" />
        <path d="M22 17v2a2 2 0 0 1-2 2H8" />
        <path d="M19 17V5a2 2 0 0 0-2-2H4" />
        <path d="M22 17H10" />
      </svg>
    </button>
  </div>

  <div class="tree-item-children" style="display: {collapsed ? 'none' : 'block'}">
    {#each data.children as child}
      <svelte:self {child} />
    {/each}
  </div>
</div>

<style>
</style>
