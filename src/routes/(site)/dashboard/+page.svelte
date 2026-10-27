<script lang="ts">
  import RecipeCard from '$lib/components/RecipeCard.svelte';
  import type {PageProps} from './$types';
  let {data}: PageProps = $props();
  const saved = $derived(data.savedMatches);
</script>

<svelte:head><title>Dashboard | FitSarap</title></svelte:head>

<section class="page"><div class="wrap">
  <span class="tag">Welcome back</span><h1>Hello, <em>{data.user?.username}.</em></h1>
  <div class="g3" style="margin:26px 0">
    <div class="card"><span class="mut sm">Pantry items</span><b class="serif" style="font-size:28px;display:block">{data.pantry.length}</b><a href="/find" class="sm ok">Edit pantry</a></div>
    <div class="card"><span class="mut sm">Saved recipes</span><b class="serif" style="font-size:28px;display:block">{saved.length}</b></div>
    <div class="card"><span class="mut sm">Exclusions</span><b class="serif" style="font-size:28px;display:block">{data.exclusions.length}</b></div>
  </div>
  <h2 style="font-size:28px;margin-bottom:16px">Saved recipes</h2>
  {#if saved.length}
    <div class="g2">{#each saved as m (m.id)}<RecipeCard {m} saved={true} />{/each}</div>
  {:else}
    <div class="card"><p class="mut">Nothing saved yet. Open a recipe and choose “Save recipe”.</p><a class="btn" href="/matches" style="margin-top:12px">Browse matches</a></div>
  {/if}
</div></section>
