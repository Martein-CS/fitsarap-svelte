<script lang="ts">
  import RecipeCard from '$lib/components/RecipeCard.svelte';
  import {recipes} from '$lib/recipes';
  import {ev, time, visible} from '$lib/score';
  import type {PageProps} from './$types';
  let {data}: PageProps = $props();

  let filter = $state('all'), category = $state('All'), sort = $state('best'), search = $state('');
  const cats = ['All', ...new Set(recipes.map((r) => r.category))];
  const filters = [['all', 'All'], ['ready', 'Can Make Now'], ['missing', 'Missing 2 or Fewer']];
  const all = $derived(visible(data.exclusions).map((r) => ev(r, data.pantry)));
  const items = $derived.by(() => {
    let l = all;
    if (filter === 'ready') l = l.filter((e) => e.ready);
    else if (filter === 'missing') l = l.filter((e) => e.need.length <= 2);
    if (category !== 'All') l = l.filter((e) => e.recipe.category === category);
    const q = search.trim().toLowerCase();
    if (q) l = l.filter((e) => (e.recipe.name + ' ' + e.recipe.ingredients.map((i) => i.name).join(' ')).toLowerCase().includes(q));
    return [...l].sort((a, b) => sort === 'fewest' ? a.need.length - b.need.length || b.pct - a.pct : sort === 'time' ? time(a.recipe) - time(b.recipe) : b.pct - a.pct);
  });
  const top = $derived(items[0]);
</script>

<svelte:head><title>Your matches | FitSarap</title></svelte:head>

<section class="page"><div class="wrap">
  <span class="tag">Ingredient-overlap ranking</span>
  <h1>Your recipe <em>Matches.</em></h1>
  <p class="mut sm" style="margin-top:6px">Based on your {data.pantry.length} available ingredients</p>
  <div class="card stats">
    <div><span class="mut sm">Ingredients available</span><b>{data.pantry.length}</b></div>
    <div><span class="mut sm">Recipes found</span><b>{all.length}</b></div>
    <div><span class="mut sm">Best match</span><b>{top ? top.recipe.name : '—'}</b></div>
    <div><span class="mut sm">Missing for best</span><b>{top ? top.need.length : '—'}</b></div>
  </div>
  <div class="filters">
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
      <label class="sm" for="q">Search<br><input id="q" bind:value={search} placeholder="Name or ingredient"></label>
      <label class="sm" for="cat">Category<br><select id="cat" bind:value={category}>{#each cats as c}<option>{c}</option>{/each}</select></label>
      <label class="sm" for="sort">Sort by<br><select id="sort" bind:value={sort}><option value="best">Best match</option><option value="fewest">Fewest missing</option><option value="time">Shortest time</option></select></label>
    </div>
    <div class="chips">{#each filters as [v, l]}<button class="chip" class:on={filter === v} onclick={() => { filter = v; }}>{l}</button>{/each}</div>
  </div>
  {#if items.length}
    <div class="g2">{#each items as e (e.recipe.id)}<RecipeCard {e} saved={data.saved.includes(e.recipe.id)} />{/each}</div>
  {:else}
    <div class="card c"><h3>No recipes match</h3><p class="mut">Try another filter or <a href="/find"><u>add more ingredients</u></a>.</p></div>
  {/if}
</div></section>
