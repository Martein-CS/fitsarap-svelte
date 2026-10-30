<script lang="ts">
  import RecipeCard from '$lib/components/RecipeCard.svelte';
  import {fmt} from '$lib/domain/score';
  import type {PageProps} from './$types';
  let {data}: PageProps = $props();
  const saved = $derived(data.savedMatches);
</script>

<svelte:head><title>Dashboard | FitSarap</title></svelte:head>

<section class="page"><div class="wrap">
  <span class="tag">My kitchen</span><h1>Welcome back, <em>{data.user?.username}.</em></h1>
  <p class="mut" style="margin-top:8px">Manage your pantry and saved recipes from one place.</p>
  <div class="card stats">
    <div><span class="mut sm">Pantry ingredients</span><b>{data.pantry.length}</b></div>
    <div><span class="mut sm">Saved recipes</span><b>{saved.length}</b></div>
    <div><span class="mut sm">Can make now</span><b>{data.readyCount}</b></div>
    <div><span class="mut sm">Exclusions</span><b>{data.exclusions.length ? data.exclusions.join(', ') : 'None'}</b></div>
  </div>

  <div class="g2" style="grid-template-columns:1fr 2fr;align-items:start">
    <div class="card">
      <h2 style="font-size:22px;margin-bottom:6px">My pantry</h2>
      {#each data.pantry as i (i.id)}<div class="row"><b>{i.name}</b><span class="mut">{fmt(i)}</span></div>
      {:else}<p class="mut sm">Your pantry is empty.</p>{/each}
      <a href="/find" class="btn" style="margin-top:14px">Manage pantry →</a>
    </div>
    <div>
      <h2 style="font-size:22px;margin-bottom:12px">Saved recipes</h2>
      {#if saved.length}
        <div style="display:grid;gap:16px">{#each saved as m (m.id)}<RecipeCard {m} saved={true} />{/each}</div>
      {:else}
        <div class="card"><p class="mut">Nothing saved yet. Open a recipe and choose “Save recipe”.</p><a class="btn" href="/matches" style="margin-top:12px">Browse matches</a></div>
      {/if}
    </div>
  </div>
</div></section>
