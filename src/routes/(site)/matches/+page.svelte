<script lang="ts">
  import RecipeCard from '$lib/components/RecipeCard.svelte';
  import type {PageProps} from './$types';
  let {data}: PageProps = $props();
  const filters = [['all', 'All'], ['ready', 'Can Make Now'], ['missing', 'Missing 2 or Fewer']];

  function href(over: Record<string, string | number>) {
    const cur: Record<string, string | number> = {...data.params, page: 1, ...over};
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(cur)) {
      const s = String(v);
      if (s && s !== 'All' && !(k === 'sort' && s === 'best') && !(k === 'filter' && s === 'all') && !(k === 'page' && s === '1')) p.set(k, s);
    }
    const qs = p.toString();
    return '/matches' + (qs ? '?' + qs : '');
  }
</script>

<svelte:head><title>Your matches | FitSarap</title></svelte:head>

<section class="page"><div class="wrap">
  <span class="tag">Ranked by the FitSarap model (Hybrid TF-IDF)</span>
  <h1>Your recipe <em>Matches.</em></h1>
  <p class="mut sm" style="margin-top:6px">Based on your {data.pantry.length} available ingredients. Cooking times come from the recipes; meal types (breakfast, lunch…) are FitSarap’s estimate from the dish name. Recipes that share none of them (or a similar ingredient) are hidden. Percentages show how many of a recipe’s main ingredients you have, not model confidence.</p>
  <div class="card stats">
    <div><span class="mut sm">Ingredients available</span><b>{data.pantry.length}</b></div>
    <div><span class="mut sm">Matching recipes</span><b>{data.matchedTotal}</b></div>
    <div><span class="mut sm">Best match</span><b>{data.top ? data.top.name : '—'}</b></div>
    <div><span class="mut sm">Missing for best</span><b>{data.top ? data.top.missingCount : '—'}</b></div>
  </div>

  {#if data.unlock.length}
    <section aria-labelledby="unlock-h">
      <h2 id="unlock-h" class="tag" style="margin:0 0 8px">One ingredient away</h2>
      <div class="unlock">
        {#each data.unlock as u (u.name)}
          <div class="card"><b class="serif" style="font-size:18px">+ {u.name}</b>
            <p class="sm mut" style="margin-top:4px">Buying this one item would complete <b>{u.count}</b> more recipes, e.g. {u.recipes.join(', ')}.</p></div>
        {/each}
      </div>
    </section>
  {/if}

  <form class="filters" method="GET" action="/matches" data-sveltekit-keepfocus>
    <input type="hidden" name="filter" value={data.params.filter}>
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
      <label class="sm" for="q">Search<br><input id="q" name="q" value={data.params.q} placeholder="Recipe or ingredient"></label>
      <label class="sm" for="meal">Meal<br>
        <select id="meal" name="meal" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
          <option value="All">All meals</option>
          {#each data.meals as m}<option value={m} selected={data.params.meal === m}>{m}</option>{/each}
        </select></label>
      <label class="sm" for="time">Cooking time<br>
        <select id="time" name="time" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
          <option value="">Any time</option>
          {#each data.times as t}<option value={t} selected={Number(data.params.time) === t}>{t} min or less</option>{/each}
        </select></label>
      <label class="sm" for="cat">Dish type<br>
        <select id="cat" name="category" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
          <option value="All">All</option>
          {#each data.cats as c}<option value={c} selected={data.params.category === c}>{c}</option>{/each}
        </select></label>
      <label class="sm" for="sort">Sort by<br>
        <select id="sort" name="sort" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
          <option value="best" selected={data.params.sort === 'best'}>Best match</option>
          <option value="fewest" selected={data.params.sort === 'fewest'}>Fewest missing</option>
          <option value="time" selected={data.params.sort === 'time'}>Shortest time</option>
        </select></label>
      <button class="btn out" type="submit">Search</button>
    </div>
    <div class="chips">{#each filters as [v, l]}<a class="chip" class:on={data.params.filter === v} href={href({filter: v})}>{l}</a>{/each}</div>
  </form>

  {#if data.items.length}
    <p class="mut sm" style="margin-bottom:12px">Showing {data.items.length} of {data.found} recipes</p>
    <div class="g2">{#each data.items as m (m.id)}<RecipeCard {m} saved={data.saved.includes(m.id)} />{/each}</div>
    {#if data.pages > 1}
      <div class="chips" style="justify-content:center;margin-top:28px;align-items:center">
        {#if data.params.page > 1}<a class="chip" href={href({page: data.params.page - 1})}>← Previous</a>{/if}
        <span class="mut sm">Page {data.params.page} of {data.pages}</span>
        {#if data.params.page < data.pages}<a class="chip" href={href({page: data.params.page + 1})}>Next →</a>{/if}
      </div>
    {/if}
  {:else if data.pantry.length === 0}
    <div class="card c"><h3>Add your ingredients first</h3><p class="mut">Recipes appear once they share an ingredient with your pantry.</p><a class="btn" href="/find" style="margin-top:12px">Add ingredients</a></div>
  {:else}
    <div class="card c"><h3>No recipes match</h3><p class="mut">None of your ingredients appear in a recipe that fits these filters. Try another filter or <a href="/find"><u>add more ingredients</u></a>.</p></div>
  {/if}
</div></section>
