<script lang="ts">
  import {enhance} from '$app/forms';
  import type {SubmitFunction} from '@sveltejs/kit';
  import Photo from '$lib/components/Photo.svelte';
  import {withToast} from '$lib/client/enhance';
  import {notify} from '$lib/client/toast.svelte';
  import {blurb, ev, fmt, need, suggestions, time} from '$lib/domain/score';
  import type {Status} from '$lib/domain/types';
  import type {PageProps} from './$types';
  let {data}: PageProps = $props();

  // Substitutions the person chose, per recipe (kept only in this browser tab).
  let chosen = $state<Record<string, string[]>>({});
  let nName = $state(''), nNote = $state('');
  const r = $derived(data.recipe);
  const applied = $derived(chosen[r.id] ?? []);
  const e = $derived(ev(r, data.pantry, applied));
  const subs = $derived(suggestions(e, applied, data.subs, data.pantry));
  const saved = $derived(data.saved.includes(r.id));
  const ST: Record<Status, [string, string]> = {enough: ['ok', '✓ Enough'], short: ['ms', '! Not enough'], unknown: ['mut', '? Check amount'], similar: ['mut', '≈ Similar item'], missing: ['ms', '! Missing']};
  const toggle = (key: string) => { chosen[r.id] = applied.includes(key) ? applied.filter((k) => k !== key) : [...applied, key]; };
  // Ingredients in this recipe that match the person's own exclusions (a recipe opened from a link is not filtered).
  const flagged = $derived(data.exclusions.filter((x) => data.flags[x]).map((x) => [x, data.flags[x]] as const));

  // Notes: accounts keep them in D1. Guests keep them in this browser (localStorage), as in the original site,
  // so the server stays stateless and the guest cookie stays small.
  const noteKey = $derived('fitsarap_notes_' + r.id);
  let guestNotes = $state<{ingredient_name: string; note: string}[]>([]);
  $effect(() => {
    if (data.user) return;
    try { guestNotes = JSON.parse(localStorage.getItem(noteKey) ?? '[]'); } catch { guestNotes = []; }
  });
  const notes = $derived(data.user ? data.notes : guestNotes);
  function saveGuest(list: typeof guestNotes) {
    guestNotes = list;
    try { localStorage.setItem(noteKey, JSON.stringify(list)); } catch { notify('Your browser blocked saving notes.'); }
  }
  const afterNote: SubmitFunction = ({cancel, submitter}) => {
    const removing = submitter?.getAttribute('formaction')?.includes('unnote');
    if (!data.user) {
      cancel();
      const name = nName.trim().slice(0, 90);
      if (!name) { notify('Enter an ingredient name.'); return; }
      saveGuest([...guestNotes.filter((n) => n.ingredient_name.toLowerCase() !== name.toLowerCase()), {ingredient_name: name, note: nNote.trim().slice(0, 500)}]);
      nName = ''; nNote = '';
      notify('Custom ingredient added (saved in this browser).');
      return;
    }
    return async ({result, update}) => {
      await update({reset: false});
      if (result.type === 'success') { if (removing) notify('Note removed.'); else { nName = ''; nNote = ''; notify('Custom ingredient added.'); } }
      else if (result.type === 'failure') notify(String(result.data?.message ?? 'Could not save.'));
    };
  };
  const removeGuest = (name: string) => saveGuest(guestNotes.filter((n) => n.ingredient_name !== name));

  // Pantry items this recipe does not use (e.g. MSG, extra chili): the person may still want to cook with them.
  const extras = $derived.by(() => {
    const keys = new Set(r.ingredients.flatMap((g) => [g.key, g.parent]));
    const noted = new Set(notes.map((n) => n.ingredient_name.toLowerCase()));
    return data.pantry.filter((p) => !keys.has(p.key ?? '') && !keys.has(p.parent ?? '') && !noted.has(p.name.toLowerCase()));
  });
  function useExtra(p: (typeof data.pantry)[number]) {
    nName = p.name;
    nNote = p.amount != null ? `from my pantry (${fmt(p)})` : 'from my pantry';
    document.getElementById('n-note')?.focus();
  }
</script>

<svelte:head><title>{r.name} | FitSarap</title></svelte:head>

<section class="page"><div class="wrap">
  <a href="/matches" class="sm" style="color:var(--gr);font-weight:700">← Back to recommendations</a>
  <div class="rhead" style="margin:22px 0 26px">
    <div>
      <span class="pill o">{e.lbl.toUpperCase()} — {e.pct}%</span>
      <div style="margin-top:10px"><span class="ttag">{r.category}</span>{#each r.meals ?? [] as meal}<span class="mtag">{meal}</span>{/each}</div>
      <h1 style="margin:14px 0 8px;font-size:clamp(32px,5vw,50px)">{r.name}</h1>
      <p class="mut">{blurb(r)}</p>
      <p class="sm" style="margin-top:12px">
        {#if r.prep}<b>Prep</b> {r.prep} min &nbsp;{/if}{#if r.cook}<b>Cook</b> {r.cook} min &nbsp;{/if}<b>Estimated total</b> {time(r) ? time(r) + ' min' : 'not listed'} &nbsp;<b>Serves</b> {r.servings}
      </p>
      <form method="POST" action="?/save" use:enhance={withToast('Saved recipes updated.')}>
        <button class="btn out" style="margin-top:14px" aria-pressed={saved}>{saved ? '★ Saved to dashboard' : '☆ Save recipe'}</button>
      </form>
    </div>
    <Photo id={r.id} name={r.name} category={r.category} dish={r.dish} min={240} caption />
  </div>

  {#if flagged.length}
    <div class="alert" role="alert"><b>⚠ Check before cooking:</b> this recipe has ingredients that match your exclusions:
      {#each flagged as [x, items], n}{n ? '; ' : ' '}<b>{x}</b> ({items.join(', ')}){/each}.
      Name matching only. Read the full ingredient list and product labels.</div>
  {/if}

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
        <caption class="sr">Recipe ingredients compared with your pantry</caption>
        <thead><tr><th scope="col">INGREDIENT</th><th scope="col">RECIPE NEEDS</th><th scope="col">YOU HAVE</th><th scope="col">STATUS</th></tr></thead>
        <tbody>{#each e.rows as x}
          <tr>
            <td><b>{x.name}</b>{#if x.staple} <span class="mut sm">(pantry staple)</span>{:else if x.optional} <span class="mut sm">(optional)</span>{/if}{#if x.prep}<span class="mut sm"> · {x.prep}</span>{/if}<div class="mut sm">{x.raw}</div></td>
            <td>{need(x)}</td>
            <td>{#if x.have}{x.status === 'similar' ? x.have.name + ' · ' : ''}{fmt(x.have)}{:else if x.staple}<span class="mut">assumed</span>{:else}—{/if}</td>
            <td class={x.staple || x.optional ? 'mut' : ST[x.status][0]}>{x.staple ? '✓ Pantry staple' : x.optional ? (x.status === 'missing' ? 'Optional' : '✓ Have it') : ST[x.status][1]}</td>
          </tr>
        {/each}</tbody>
      </table></div>
    </div>

    <div style="display:grid;gap:16px">
    {#if subs.length}
      <div class="sub">
        <span class="tag" style="color:var(--warn)">Suggested substitutions</span><h3>Make this more compatible</h3>
        {#each subs as s (s.key)}
          <div class="bx"><span class="ms sm">MISSING</span><br><b>{s.name}</b><br>↓<br><span class="ok sm">TRY INSTEAD</span><br><b>{s.use}</b>{#if s.inPantry} <span class="pill" style="font-size:11px">IN YOUR PANTRY</span>{/if}
            <p class="sm mut" style="margin:6px 0">{s.note}</p>
            <p class="sm mut" style="margin:0 0 6px;font-size:11px">{s.source === 'recipes' ? 'Source: alternatives written by recipe authors in the dataset.' : 'Source: FitSarap team’s general cooking guidance.'}</p>
            <button class="btn" style="width:100%" onclick={() => toggle(s.key)}>{s.done ? '✓ Applied. Keep original instead' : '↻ Use ' + s.use.toLowerCase() + ' instead'}</button></div>
        {/each}
      </div>
    {/if}
      <aside class="notice" aria-labelledby="before-h">
        <h3 id="before-h">Before cooking</h3>
        <p>{e.need.length ? 'Still needed: ' + e.need.map((x) => x.name + (x.status === 'short' ? ' (more)' : '')).join(', ') + '.' : '✓ You have all essential ingredients.'}</p>
        {#if e.scale}<p>Your amounts are enough for about <b>{e.scale.servings || 'less than 1'}</b> of {e.scale.of} servings ({e.scale.limiting} runs out first). You can scale the recipe down.</p>{/if}
        {#if e.rows.some((x) => !x.optional && !x.staple && x.status === 'unknown')}<p>Some amounts could not be compared (different kinds of units, or no quantity entered). Check them yourself.</p>{/if}
        {#if e.similar.length}<p>You have a similar item for {e.similar.map((x) => x.name).join(', ')}; the taste may differ a little.</p>{/if}
        {#if notes.length}<p>Your additions: {notes.map((n) => n.ingredient_name + (n.note ? ` (${n.note})` : '')).join(', ')}.</p>{/if}
        <p class="sm mut">Pantry staples (water, salt, pepper, cooking oil) are assumed. Substitutions are suggestions, not tested recipes. Always check food safety and allergies.</p>
      </aside>
    </div>
  </div>

  <form class="card" style="margin-top:30px" method="POST" action="?/note" use:enhance={afterNote}>
    <span class="tag">Your own additions</span><h3>Extra ingredients or seasoning (e.g. MSG)</h3>
    <p class="sm mut">{data.user ? 'Saved to your account.' : 'Saved in this browser only. Log in to keep them across devices.'} Extra ingredients are your choice and do not change the match.</p>
    <div class="g2" style="gap:12px">
      <div><label for="n-name">Ingredient</label><input id="n-name" name="name" bind:value={nName} maxlength="90" placeholder="e.g. MSG"></div>
      <div><label for="n-note">Note</label><input id="n-note" name="note" bind:value={nNote} placeholder="e.g. 1 pinch" maxlength="500"></div>
    </div>
    {#if extras.length}
      <p class="sm" style="margin-top:12px"><b>In your pantry but not in this recipe:</b> tap one to add it as your own addition.</p>
      <div class="chips" style="margin-top:6px">{#each extras as p (p.id)}<button type="button" class="chip" onclick={() => useExtra(p)}>+ {p.name}</button>{/each}</div>
    {/if}
    <button class="btn" type="submit" style="margin-top:12px">Add</button>
    <div style="margin-top:12px">
      {#each notes as n (n.ingredient_name)}<div class="row"><b>{n.ingredient_name}</b><span class="mut">{n.note}</span>
        {#if data.user}
          <button class="x" formaction="?/unnote" name="del" value={n.ingredient_name} formnovalidate aria-label={'Remove ' + n.ingredient_name}>×</button>
        {:else}
          <button class="x" type="button" onclick={() => removeGuest(n.ingredient_name)} aria-label={'Remove ' + n.ingredient_name}>×</button>
        {/if}</div>
      {:else}<p class="sm mut">No additional ingredients yet.</p>{/each}
    </div>
  </form>

  <div class="card g2" style="grid-template-columns:1fr 2fr;margin-top:30px;padding:30px">
    <div><span class="tag">Cooking instructions</span><h2 style="font-size:26px">Let’s get cooking.</h2></div>
    <ol style="margin:0;padding:0;list-style:none">
      {#each r.steps as t, n}<li class="row" style={n ? '' : 'border-top:0;padding-top:0'}><span class="pill" style="border-radius:50%;padding:2px 8px">{n + 1}</span><b style="font-weight:400">{t}</b></li>{/each}
    </ol>
  </div>
</div></section>
