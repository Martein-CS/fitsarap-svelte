<script lang="ts">
  import {enhance} from '$app/forms';
  import type {SubmitFunction} from '@sveltejs/kit';
  import {withToast} from '$lib/enhance';
  import {notify} from '$lib/toast.svelte';
  import {exclusions, stock, units} from '$lib/recipes';
  import {fmt} from '$lib/score';
  import type {PantryItem} from '$lib/types';
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
      <input id="ing-name" name="name" list="stock-options" bind:value={name} placeholder="e.g. chicken, egg, tomato…" autocomplete="off" maxlength="90">
      <datalist id="stock-options">{#each stock as s}<option value={s}></option>{/each}</datalist>
      <div class="g2" style="gap:12px">
        <div><label for="ing-amt">Quantity</label><input id="ing-amt" name="amount" type="number" min="0" step="any" bind:value={amount} disabled={unknown}></div>
        <div><label for="ing-unit">Unit</label><select id="ing-unit" name="unit" bind:value={unit} disabled={unknown}>{#each units as u}<option>{u}</option>{/each}</select></div>
      </div>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="approximate" style="width:auto" bind:checked={approx}> Approximate amount</label>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="unknown" style="width:auto" bind:checked={unknown}> I don’t know the quantity</label>
      <div class="chips" style="margin-top:12px">{#each stock.slice(0, 10) as s}<button type="button" class="chip" onclick={() => { name = s; }}>{s}</button>{/each}</div>
      <button class="btn" type="submit" style="margin-top:16px">+ Add ingredient</button>
    </form>

    <div class="card">
      <div style="display:flex;justify-content:space-between"><span class="tag" style="margin:0">My available ingredients</span>
        {#if data.pantry.length}<form method="POST" action="?/clear" use:enhance={confirmClear}><button class="x sm">Clear all</button></form>{/if}
      </div>
      <h3 style="margin:4px 0 8px">{data.pantry.length} ingredient{data.pantry.length === 1 ? '' : 's'} added</h3>
      {#each data.pantry as i (i.id)}
        <div class="row"><b>{i.name}</b><span class="mut">{fmt(i)}</span>
          <button class="x" type="button" aria-label={'Edit ' + i.name} onclick={() => edit(i)}>✎</button>
          <form method="POST" action="?/remove" use:enhance={withToast('Ingredient removed.')}>
            <input type="hidden" name="id" value={i.id}><button class="x" aria-label={'Remove ' + i.name}>×</button>
          </form></div>
      {:else}
        <p class="mut sm">Nothing added yet. Add an ingredient to begin.</p>
      {/each}
    </div>
  </div>

  <details class="card" style="margin-top:16px">
    <summary><span><span class="tag" style="margin:0">Optional</span><b class="serif" style="font-size:19px">Dietary &amp; allergy considerations</b><br><span class="mut sm">Recipes containing these ingredient names are hidden. This is not a verified allergy filter.</span></span><span>+</span></summary>
    <form method="POST" action="?/exclusions" use:enhance={withToast('Exclusions updated.')} onchange={(e) => e.currentTarget.requestSubmit()}>
      <div class="chips" style="margin-top:14px">
        {#each exclusions as x}
          <label class="chip" style="display:flex;gap:6px;align-items:center;margin:0"><input type="checkbox" name="ex" value={x} style="width:auto" checked={data.exclusions.includes(x)}>{x}</label>
        {/each}
      </div>
    </form>
  </details>

  <div class="cta"><div><span class="pill">READY</span><h3 style="margin-top:8px">Ready when you are.</h3><p class="mut sm">FitSarap will compare your ingredients, quantities, and missing items.</p></div><a class="btn" href="/matches">Find my recipe matches →</a></div>
</div></section>
