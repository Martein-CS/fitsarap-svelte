<script lang="ts">
  let {id, name, category, pct = null, min = 0}: {id: string; name: string; category: string; pct?: number | null; min?: number} = $props();
  const EMOJI: Record<string, string> = {Soup: '🍲', Noodles: '🍜', Stew: '🍛', 'Adobo & Paksiw': '🍗', 'Grilled & Fried': '🍖', 'Coconut milk (ginataan)': '🥥', Vegetables: '🥬', Rice: '🍚', Seafood: '🦐', Other: '🍽'};
  const PAL = [['#7a3a12', '#d98a3a'], ['#7fa876', '#eaf1d2'], ['#b8321a', '#f08a3c'], ['#6b3f7a', '#c9a0d8'], ['#c9a15a', '#f6e7bd'], ['#4d8a4a', '#b8dd9a'], ['#d9b45a', '#fbeab0'], ['#3d7a8a', '#a9d9de']];
  const c = $derived(PAL[[...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PAL.length]);
</script>

<div class="rp" style:min-height={min ? min + 'px' : null}>
  <div class="ph" style="--a:{c[0]};--b:{c[1]};--s:64px">{EMOJI[category] ?? '🍽'}</div>
  {#key id}<img src={'/images/recipes/' + id + '.jpg'} alt={name} loading="lazy" onerror={(e) => e.currentTarget.remove()}>{/key}
  {#if pct !== null}<i class="pc">{pct}%</i>{/if}
</div>
