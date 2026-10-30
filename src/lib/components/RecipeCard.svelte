<script lang="ts">
  import {enhance} from '$app/forms';
  import Photo from './Photo.svelte';
  import {withToast} from '$lib/client/enhance';
  import type {MatchSummary} from '$lib/domain/types';
  let {m, saved}: {m: MatchSummary; saved: boolean} = $props();
</script>

<div class="card rc">
  <Photo id={m.id} name={m.name} category={m.category} dish={m.dish} pct={m.pct} />
  <div>
    <h3><a href={'/recipe/' + m.id}>{m.name}</a></h3>
    <span class="pill o">{m.lbl.toUpperCase()}</span>
    <div style="margin-top:6px"><span class="ttag">⏱ {m.total ? 'Est. ' + m.total + ' min' : 'Time not listed'}</span>{#each m.meals as meal}<span class="mtag">{meal}</span>{/each}</div>
    <p>{m.blurb}</p>
    <p>{m.servings} servings · {m.category}</p>
    <div class={m.missing.length ? 'note' : 'pill'} style="display:block;margin-bottom:10px">
      {m.missing.length ? '! Missing: ' + m.missing.join(', ') + (m.missingCount > m.missing.length ? ` +${m.missingCount - m.missing.length} more` : '') : '✓ You can make this now'} · {m.have}/{m.tot} ingredients
    </div>
    {#if m.canSub.length}<p class="sm ok" style="margin:0 0 8px">↻ Swap with what you have: {m.canSub.join(', ')}</p>{/if}
    <details><summary class="sm" style="color:var(--gr);font-weight:700">Why this matches <span aria-hidden="true">▾</span></summary><p>{m.why}</p>
      {#if m.distinct.length}<p class="sm mut">Key matches the model weighed most: {m.distinct.join(', ')}.</p>{/if}</details>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <a class="btn" href={'/recipe/' + m.id} aria-label={'View recipe: ' + m.name}>View recipe →</a>
      <form method="POST" action={'/recipe/' + m.id + '?/save'} use:enhance={withToast('Saved recipes updated.')}>
        <button class="btn out" aria-pressed={saved} aria-label={(saved ? 'Remove from saved: ' : 'Save recipe: ') + m.name}>{saved ? '★ Saved' : '☆ Save'}</button>
      </form>
    </div>
  </div>
</div>
