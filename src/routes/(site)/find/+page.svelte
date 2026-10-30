<script lang="ts">
  import {enhance} from '$app/forms';
  import type {SubmitFunction} from '@sveltejs/kit';
  import {withToast} from '$lib/client/enhance';
  import {notify} from '$lib/client/toast.svelte';
  import {exclusions, stock, STOCK, units} from '$lib/domain/constants';
  import names from '$lib/data/ingredient-names.json';
  import {fmt} from '$lib/domain/score';
  import type {PantryItem} from '$lib/domain/types';
  import type {PageProps} from './$types';
  let {data}: PageProps = $props();

  let name = $state(''), amount = $state(500), unit = $state('g'), approx = $state(false), unknown = $state(false);
  const afterAdd: SubmitFunction = () => async ({result, update}) => {
    await update({reset: false});
    if (result.type === 'success') { name = ''; notify('Ingredient saved.'); }
    else if (result.type === 'failure') notify(String(result.data?.message ?? 'Could not save.'));
  };
  const confirmClear: SubmitFunction = ({cancel}) => {
    if (!confirm('Remove all pantry ingredients?')) cancel();
    return async ({update}) => { await update(); };
  };
  const groups = Object.keys(STOCK);
  let group = $state('All'), stockQ = $state('');
  const shown = $derived((group === 'All' ? stock : STOCK[group]).filter((s) => s.toLowerCase().includes(stockQ.trim().toLowerCase())));
  const inPantry = (s: string) => data.pantry.some((p) => p.name.toLowerCase() === s.toLowerCase() || p.key === s.toLowerCase());
  function pick(s: string) { name = s; unknown = false; document.getElementById('ing-amt')?.focus(); }
  function edit(i: PantryItem) { name = i.name; amount = i.amount ?? 500; unit = i.unit ?? 'g'; approx = i.approximate; unknown = i.amount == null; }
</script>

<svelte:head><title>Find recipes | FitSarap</title></svelte:head>

<section class="page"><div class="wrap" style="max-width:860px">
  <div class="c"><span class="tag">Your kitchen, right now</span><h1 style="font-size:clamp(32px,4.4vw,48px)">What ingredients <em>do you have?</em></h1>
    <p class="mut" style="margin-top:12px">Add what’s available and approximate amounts. {#if data.user}Your pantry is saved to your account.{:else}<a href="/login"><u>Log in</u></a> to keep your pantry across devices.{/if}</p></div>

  <div class="g2" style="align-items:start">
    <form class="card" method="POST" action="?/add" use:enhance={afterAdd}>
      <span class="tag" style="margin:0">Add an ingredient</span><h3>Start with what’s on hand</h3>
      <label for="ing-name">Ingredient name</label>
      <input id="ing-name" name="name" list="stock-options" bind:value={name} placeholder="e.g. chicken, manok, kangkong, toyo…" autocomplete="off" maxlength="90">
      <datalist id="stock-options">{#each names as s}<option value={s}></option>{/each}</datalist>
      <div class="g2" style="gap:12px">
        <div><label for="ing-amt">Quantity</label><input id="ing-amt" name="amount" type="number" min="0" step="any" bind:value={amount} disabled={unknown}></div>
        <div><label for="ing-unit">Unit</label><select id="ing-unit" name="unit" bind:value={unit} disabled={unknown}>{#each units as u}<option>{u}</option>{/each}</select></div>
      </div>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="approximate" style="width:auto" bind:checked={approx}> Approximate amount</label>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="unknown" style="width:auto" bind:checked={unknown}> I don’t know the quantity</label>
      <div class="stock-box" role="group" aria-labelledby="stock-h">
        <p id="stock-h" class="tag" style="margin:0">Stock ingredients ({stock.length})</p>
        <p class="sm mut" style="margin:2px 0 0">Pick from the list, then set the quantity and press Add. Green ones are already in your pantry.</p>
        <div class="stock-tabs">
          {#each ['All', ...groups] as g}<button type="button" aria-pressed={group === g} onclick={() => (group = g)}>{g}</button>{/each}
        </div>
        <label class="sr" for="stock-q">Filter stock ingredients</label>
        <input id="stock-q" bind:value={stockQ} placeholder="Filter the list, e.g. sauce" autocomplete="off" style="margin-bottom:10px">
        <div class="chips">
          {#each shown as s (s)}<button type="button" class="chip" class:have={inPantry(s)} aria-pressed={name === s} onclick={() => pick(s)}>{inPantry(s) ? '✓' : '+'} {s}</button>
          {:else}<span class="sm mut">Not in the stock list. Type it in the ingredient name box instead.</span>{/each}
        </div>
      </div>
      <p class="sm mut" style="margin-top:10px">Not on the list? Type anything else you plan to use, such as MSG or a seasoning mix. Unknown names are kept and shown as-is.</p>
      <button class="btn" type="submit" style="margin-top:16px">+ Add / update ingredient</button>
    </form>

    <div class="card">
      <div style="display:flex;justify-content:space-between"><span class="tag" style="margin:0">My available ingredients</span>
        {#if data.pantry.length}<form method="POST" action="?/clear" use:enhance={confirmClear}><button class="x sm">Clear all</button></form>{/if}
      </div>
      <h3 style="margin:4px 0 8px">{data.pantry.length} ingredient{data.pantry.length === 1 ? '' : 's'} added</h3>
      {#each data.pantry as i (i.id)}
        <div class="row"><b>{i.name}{#if i.known === false} <span class="pill o" style="font-size:10px">NOT RECOGNISED</span>{:else if i.key && i.key !== i.name.toLowerCase()} <span class="mut sm">→ {i.key}</span>{/if}</b><span class="mut">{fmt(i)}</span>
          <button class="x" type="button" aria-label={'Edit ' + i.name} onclick={() => edit(i)}>✎</button>
          <form method="POST" action="?/remove" use:enhance={withToast('Ingredient removed.')}>
            <input type="hidden" name="id" value={i.id}><button class="x" aria-label={'Remove ' + i.name}>×</button>
          </form></div>
      {:else}
        <p class="mut sm">Nothing added yet. Add an ingredient to begin.</p>
      {/each}
      {#if data.pantry.some((p) => p.known === false)}
        <p class="sm mut" style="margin-top:10px">Names marked “not recognised” are kept, but no recipe uses them yet, so they do not change your matches.</p>
      {/if}
      {#if !data.user}<p class="sm mut" style="margin-top:10px">Guest pantry is kept in this browser only. <a href="/register"><u>Create an account</u></a> to save it across devices.</p>{/if}
    </div>
  </div>

  {#if data.related.length}
    <div class="card" style="margin-top:16px">
      <span class="tag" style="margin:0">Often cooked with your ingredients</span>
      <h3 style="margin:4px 0 4px">Do you also have any of these?</h3>
      <p class="sm mut" style="margin-bottom:12px">Learned from which ingredients appear together in the 1,911 recipes. Adding one you already have can unlock more dishes.</p>
      <div class="chips">{#each data.related as r (r.name)}<button type="button" class="chip" title={'Often used with ' + r.with.join(', ')} onclick={() => pick(r.name)}>+ {r.name} <span class="mut">· with {r.with.slice(0, 2).join(', ')}</span></button>{/each}</div>
    </div>
  {/if}

  <details class="card" style="margin-top:16px">
    <summary><span><span class="tag" style="margin:0">Optional{data.exclusions.length ? ` · ${data.exclusions.length} on` : ''}</span><b class="serif" style="font-size:19px">Dietary &amp; allergy considerations</b><br><span class="mut sm">Recipes with a matching ingredient, garnishes included, are hidden. Filipino names and hidden sources (bagoong, patis, toyo, oyster sauce) are checked too. This is name matching, not a guarantee: always read the recipe and product labels.</span></span><span aria-hidden="true">+</span></summary>
    <form method="POST" action="?/exclusions" use:enhance={withToast('Exclusions updated.')} onchange={(e) => e.currentTarget.requestSubmit()}>
      <div class="chips" style="margin-top:14px">
        {#each exclusions as x}
          <label class="chip" style="display:flex;gap:6px;align-items:center;margin:0"><input type="checkbox" name="ex" value={x} style="width:auto" checked={data.exclusions.includes(x)}>{x}</label>
        {/each}
      </div>
      <noscript><button class="btn out" style="margin-top:12px">Save exclusions</button></noscript>
    </form>
  </details>

  <div class="cta"><div><span class="pill">READY</span><h3 style="margin-top:8px">Ready when you are.</h3><p class="mut sm">FitSarap will compare your ingredients, quantities, and missing items.</p></div><a class="btn" href="/matches">Find my recipe matches →</a></div>
</div></section>
