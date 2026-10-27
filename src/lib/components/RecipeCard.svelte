<script lang="ts">
  import {enhance} from '$app/forms';
  import Photo from './Photo.svelte';
  import {withToast} from '$lib/enhance';
  import {time} from '$lib/score';
  import type {Evaluation} from '$lib/types';
  let {e, saved}: {e: Evaluation; saved: boolean} = $props();
  const r = $derived(e.recipe);
</script>

<div class="card rc">
  <Photo {r} pct={e.pct} />
  <div>
    <h3>{r.name}</h3>
    <span class="pill o">{e.lbl.toUpperCase()}</span>
    <p>{r.description}</p>
    <p>⏱ {time(r)} min · {r.servings} servings · {r.category}</p>
    <div class={e.need.length ? 'note' : 'pill'} style="display:block;margin-bottom:10px">
      {e.need.length ? '! Missing: ' + e.need.map((x) => x.name).join(', ') : '✓ You can make this now'} · {e.okN.length}/{e.tot} ingredients
    </div>
    <details><summary class="sm" style="color:var(--gr);font-weight:700">Why this matches <span>▾</span></summary><p>{e.why}</p></details>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <a class="btn" href={'/recipe/' + r.id}>View recipe →</a>
      <form method="POST" action={'/recipe/' + r.id + '?/save'} use:enhance={withToast('Saved recipes updated.')}>
        <button class="btn out">{saved ? '★ Saved' : '☆ Save'}</button>
      </form>
    </div>
  </div>
</div>
