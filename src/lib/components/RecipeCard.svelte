<script lang="ts">
  import {enhance} from '$app/forms';
  import Photo from './Photo.svelte';
  import {withToast} from '$lib/enhance';
  import type {MatchSummary} from '$lib/types';
  let {m, saved}: {m: MatchSummary; saved: boolean} = $props();
</script>

<div class="card rc">
  <Photo id={m.id} name={m.name} category={m.category} pct={m.pct} />
  <div>
    <h3>{m.name}</h3>
    <span class="pill o">{m.lbl.toUpperCase()}</span>
    <p>{m.blurb}</p>
    <p>⏱ {m.total ? m.total + ' min · ' : ''}{m.servings} servings · {m.category}</p>
    <div class={m.missing.length ? 'note' : 'pill'} style="display:block;margin-bottom:10px">
      {m.missing.length ? '! Missing: ' + m.missing.join(', ') : '✓ You can make this now'} · {m.have}/{m.tot} ingredients
    </div>
    <details><summary class="sm" style="color:var(--gr);font-weight:700">Why this matches <span>▾</span></summary><p>{m.why}</p></details>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <a class="btn" href={'/recipe/' + m.id}>View recipe →</a>
      <form method="POST" action={'/recipe/' + m.id + '?/save'} use:enhance={withToast('Saved recipes updated.')}>
        <button class="btn out">{saved ? '★ Saved' : '☆ Save'}</button>
      </form>
    </div>
  </div>
</div>
