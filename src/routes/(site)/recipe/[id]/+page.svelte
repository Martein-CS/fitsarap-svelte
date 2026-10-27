<script lang="ts">
  import {enhance} from '$app/forms';
  import type {SubmitFunction} from '@sveltejs/kit';
  import Photo from '$lib/components/Photo.svelte';
  import {withToast} from '$lib/enhance';
  import {notify} from '$lib/toast.svelte';
  import {recipes} from '$lib/recipes';
  import {ev, fmt, SUBS, time} from '$lib/score';
  import type {Status} from '$lib/types';
  import type {PageProps} from './$types';
  let {data}: PageProps = $props();

  let subs = $state<Record<string, boolean>>({});
  let nName = $state(''), nNote = $state('');
  const r = $derived(recipes.find((x) => x.id === data.recipeId)!);
  const applied = $derived(!!subs[data.recipeId]);
  const e = $derived(ev(r, data.pantry, applied));
  const s = $derived(SUBS[data.recipeId]);
  const saved = $derived(data.saved.includes(data.recipeId));
  const ST: Record<Status, [string, string]> = {enough: ['ok', '✓ Enough'], short: ['ms', '! Not enough'], unknown: ['mut', '? Check amount'], missing: ['ms', '! Missing']};
  const afterNote: SubmitFunction = () => async ({result, update}) => {
    await update({reset: false});
    if (result.type === 'success') { nName = ''; nNote = ''; notify('Custom ingredient added.'); }
    else if (result.type === 'failure') notify(String(result.data?.message ?? 'Could not save.'));
  };
</script>

<svelte:head><title>{r.name} | FitSarap</title></svelte:head>

<section class="page"><div class="wrap">
  <a href="/matches" class="sm" style="color:var(--gr);font-weight:700">← Back to recommendations</a>
  <div class="rhead" style="margin:22px 0 26px">
    <div>
      <span class="pill o">{e.lbl.toUpperCase()} — {e.pct}%</span>
      <h1 style="margin:14px 0 8px;font-size:clamp(36px,5vw,54px)">{r.name}</h1>
      <p class="mut">{r.description}</p>
      <p class="sm" style="margin-top:12px"><b>Prep</b> {r.prep} min &nbsp; <b>Cook</b> {r.cook} min &nbsp; <b>Total</b> {time(r)} min &nbsp; <b>Serves</b> {r.servings}</p>
      <form method="POST" action="?/save" use:enhance={withToast('Saved recipes updated.')}>
        <button class="btn out" style="margin-top:14px">{saved ? '★ Saved to dashboard' : '☆ Save recipe'}</button>
      </form>
    </div>
    <Photo {r} min={240} />
  </div>

  <div class="card" style="background:var(--mint);display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:18px;align-items:center">
    <div><span class="sm mut">YOUR INGREDIENT MATCH</span><div><span class="serif" style="font-size:38px">{e.pct}%</span> <span class="ok sm">{e.lbl}</span></div><div class="bd"><i style="width:{e.pct}%"></i></div></div>
    <div><span class="sm mut">Available</span><br><b>{e.okN.length} of {e.tot}</b></div>
    <div><span class="sm mut">Missing or short</span><br><b>{e.need.length}</b></div>
  </div>

  <div class="g2" style="grid-template-columns:1.6fr 1fr;align-items:start;margin-top:34px">
    <div>
      <span class="tag">Why FitSarap recommended this</span>
      <h2 style="font-size:26px">A match explained in plain language.</h2>
      <p class="mut" style="margin:8px 0 28px">{e.why}</p>
      <h2 style="font-size:26px;margin-bottom:12px">What you need, compared</h2>
      <div class="tb"><table>
        <thead><tr><th>INGREDIENT</th><th>RECIPE NEEDS</th><th>YOU HAVE</th><th>STATUS</th></tr></thead>
        <tbody>{#each e.rows as x}
          <tr><td><b>{x.name}</b>{#if x.optional} <span class="mut sm">(optional)</span>{/if}</td><td>{x.amount} {x.unit}</td><td>{x.have ? fmt(x.have) : '0'}</td><td class={ST[x.status][0]}>{ST[x.status][1]}</td></tr>
        {/each}</tbody>
      </table></div>
    </div>

    {#if s && (e.canSub || applied)}
      <div class="sub">
        <span class="tag" style="color:var(--warn)">Suggested substitution</span><h3>Make this more compatible</h3>
        <div class="bx"><span class="ms sm">MISSING</span><br><b>{s.f}</b><br>↓<br><span class="ok sm">TRY INSTEAD</span><br><b>{s.use} — {s.q}</b></div>
        <p class="sm mut">{s.note}</p>
        <button class="btn" style="width:100%;margin-top:14px" onclick={() => { subs[data.recipeId] = true; }} disabled={applied}>{applied ? '✓ Substitution applied' : '↻ Use ' + s.use.toLowerCase() + ' instead'}</button>
        {#if applied}<button class="btn out" style="width:100%;margin-top:8px" onclick={() => { subs[data.recipeId] = false; }}>Keep original recipe</button>{/if}
      </div>
    {:else if !e.need.length}
      <div class="card" style="border-color:var(--gr)"><b class="ok">✓ You have all essential ingredients.</b></div>
    {/if}
  </div>

  <form class="card" style="margin-top:30px" method="POST" action="?/note" use:enhance={afterNote}>
    <span class="tag">Your own additions</span><h3>Extra ingredients or seasoning (e.g. MSG)</h3>
    <p class="sm mut">{data.user ? 'Saved to your account.' : 'Log in to save your own notes on a recipe.'}</p>
    <div class="g2" style="gap:12px">
      <div><label for="n-name">Ingredient</label><input id="n-name" name="name" bind:value={nName} maxlength="90"></div>
      <div><label for="n-note">Note</label><input id="n-note" name="note" bind:value={nNote} placeholder="e.g. 1 pinch" maxlength="500"></div>
    </div>
    <button class="btn" type="submit" style="margin-top:12px">Add</button>
    <div style="margin-top:12px">
      {#each data.notes as n}<div class="row"><b>{n.ingredient_name}</b><span class="mut">{n.note}</span></div>{:else}<p class="sm mut">No additional ingredients yet.</p>{/each}
    </div>
  </form>

  <div class="card g2" style="grid-template-columns:1fr 2fr;margin-top:30px;padding:30px">
    <div><span class="tag">Cooking instructions</span><h2 style="font-size:26px">Let’s get cooking.</h2></div>
    <ol style="margin:0;padding:0;list-style:none">
      {#each r.steps as t, n}<li class="row" style={n ? '' : 'border-top:0;padding-top:0'}><span class="pill" style="border-radius:50%;padding:2px 8px">{n + 1}</span><b style="font-weight:400">{t}</b></li>{/each}
    </ol>
  </div>
</div></section>
