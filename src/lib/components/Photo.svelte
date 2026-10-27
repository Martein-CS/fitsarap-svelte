<script lang="ts">
  import {recipes} from '$lib/recipes';
  import type {Recipe} from '$lib/types';
  let {r, pct = null, min = 0}: {r: Recipe; pct?: number | null; min?: number} = $props();
  const EMOJI: Record<string, string> = {adobo: '🍗', tinola: '🍲', afritada: '🍅', torta: '🍆', caldo: '🥣', togue: '🌱', sinangag: '🍚', sinigang: '🍲'};
  const PAL = [['#7a3a12', '#d98a3a'], ['#7fa876', '#eaf1d2'], ['#b8321a', '#f08a3c'], ['#6b3f7a', '#c9a0d8'], ['#c9a15a', '#f6e7bd'], ['#4d8a4a', '#b8dd9a'], ['#d9b45a', '#fbeab0'], ['#3d7a8a', '#a9d9de']];
  const c = $derived(PAL[Math.max(recipes.findIndex((x) => x.id === r.id), 0) % PAL.length]);
  let broken = $state(false);
</script>

<div class="rp" style:min-height={min ? min + 'px' : null}>
  <div class="ph" style="--a:{c[0]};--b:{c[1]};--s:64px">{EMOJI[r.id] ?? '🍽'}</div>
  {#if !broken}<img src={r.image} alt={r.name} loading="lazy" onerror={() => { broken = true; }}>{/if}
  {#if pct !== null}<i class="pc">{pct}%</i>{/if}
</div>
