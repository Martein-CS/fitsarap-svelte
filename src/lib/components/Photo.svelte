<script lang="ts" module>
  // Photo priority, best first:
  //   1. the team's own photo of this recipe:      src/lib/assets/recipes/<recipe-id>.jpg|png|webp
  //   2. the team's own photo of the dish family:  src/lib/assets/dishes/<dish>.jpg|png|webp  (e.g. adobo.jpg)
  //   3. an example photo of the dish family from Wikimedia Commons (/img/dish/<dish>), credited
  //   4. an illustration (emoji on a colour gradient) when nothing else is available
  // Local files get hashed names from Vite, so the CDN caches them forever, and only files that exist are referenced.
  import {dishByKey} from '$lib/domain/dishes';
  const glob = (files: Record<string, string>) =>
    Object.fromEntries(Object.entries(files).map(([p, u]) => [p.split('/').pop()!.replace(/\.\w+$/, ''), u])) as Record<string, string>;
  const RECIPE = glob(import.meta.glob('/src/lib/assets/recipes/*.{jpg,jpeg,png,webp}', {eager: true, query: '?url', import: 'default'}));
  const DISH = glob(import.meta.glob('/src/lib/assets/dishes/*.{jpg,jpeg,png,webp}', {eager: true, query: '?url', import: 'default'}));
  const EMOJI: Record<string, string> = {Soup: '🍲', Noodles: '🍜', Stew: '🍛', 'Adobo & Paksiw': '🍗', 'Grilled & Fried': '🍖', 'Coconut milk (ginataan)': '🥥', Vegetables: '🥬', Rice: '🍚', Seafood: '🦐', 'Dessert & Snacks': '🍮', Other: '🍽'};
  const PAL = [['#7a3a12', '#d98a3a'], ['#7fa876', '#eaf1d2'], ['#b8321a', '#f08a3c'], ['#6b3f7a', '#c9a0d8'], ['#c9a15a', '#f6e7bd'], ['#4d8a4a', '#b8dd9a'], ['#d9b45a', '#fbeab0'], ['#3d7a8a', '#a9d9de']];
</script>

<script lang="ts">
  let {id, name, category, dish = null, pct = null, min = 0, caption = false}:
    {id: string; name: string; category: string; dish?: string | null; pct?: number | null; min?: number; caption?: boolean} = $props();
  const c = $derived(PAL[[...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PAL.length]);
  const own = $derived(RECIPE[id] ?? (dish ? DISH[dish] : undefined));
  const remote = $derived(!own && dish ? '/img/dish/' + dish : undefined);
  const label = $derived(dish ? dishByKey.get(dish)?.label ?? dish : '');
  let failed = $state(false);
  $effect(() => { void id; failed = false; });
</script>

<figure class="rp" style:min-height={min ? min + 'px' : null}>
  <div class="ph" style="--a:{c[0]};--b:{c[1]};--s:64px" aria-hidden="true">{EMOJI[category] ?? '🍽'}</div>
  {#if own}
    <img src={own} alt={'Photo of ' + name} loading="lazy" decoding="async">
  {:else if remote && !failed}
    <img src={remote} alt={'Example photo of ' + label + ' (not this exact recipe)'} loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror={() => (failed = true)}>
    <a class="credit" href={remote + '?credit'} target="_blank" rel="noopener" title="Example photo of the dish from Wikimedia Commons. Click for author and license.">📷 Wikimedia</a>
  {/if}
  {#if pct !== null}<i class="pc" aria-label={pct + '% ingredient match'}>{pct}%</i>{/if}
  {#if caption && remote && !failed}<figcaption class="sm mut">Example photo of {label} (Wikimedia Commons). Your dish may look different.</figcaption>{/if}
</figure>
