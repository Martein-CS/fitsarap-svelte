<script lang="ts">
  import Photo from '$lib/components/Photo.svelte';
  import type {PageProps} from './$types';
  let {data}: PageProps = $props();
  const best = $derived(data.best);
  const steps = [['🫙', 'Add your ingredients', 'Enter ingredients and approximate amounts you already have.'], ['✨', 'FitSarap checks them', 'It compares quantities and recipe needs.'], ['🍲', 'Get Filipino recipe matches', 'See ranked recipes, missing items, and instructions.']];
  const perks = [['🥘', 'Use what you have', 'Discover meals based on ingredients already at home.'], ['🛒', 'Reduce extra purchases', 'Prioritize recipes needing fewer additional ingredients.'], ['↗', 'Flexible matching', 'Find useful options even without a perfect match.'], ['🇵🇭', 'Filipino-focused', 'Explore familiar dishes built around local flavors.']];
</script>

<svelte:head><title>FitSarap | Cook smarter. Waste less.</title></svelte:head>

<section style="background:var(--mint)"><div class="wrap hero" style="padding:56px 20px">
  <div>
    <span class="tag">★ Filipino recipe recommendation</span>
    <h1>Turn the ingredients you have into a <em>Filipino meal.</em></h1>
    <p>Tell FitSarap what’s in your kitchen. It finds dishes that best fit your ingredients, quantities, and available alternatives.</p>
    <div class="acts"><a class="btn" href="/find">Find recipes from my ingredients →</a><a class="btn out" href="/how">How FitSarap works</a></div>
    <div class="chk">✓ Quantity-aware &nbsp; ✓ Filipino-focused</div>
  </div>
  <div class="cl">
    {#if best}<Photo id={best.id} name={best.name} category={best.category} />{/if}
    <div class="badge"><span class="pill">TOP MATCH</span><br><b class="serif" style="font-size:20px">{best ? best.pct : 0}% match</b><br><span class="mut">{best ? best.name : 'Add ingredients to see a match'}</span></div>
  </div>
</div></section>

<section class="sec c"><div class="wrap">
  <span class="tag">A simpler way to decide dinner</span><h2>From pantry to plate in three clear steps.</h2>
  <div class="g3" style="margin-top:34px;text-align:left">
    {#each steps as [i, t, d], n}
      <div class="stp"><div class="ic">{i}</div><div><div class="mut sm">0{n + 1}</div><h3 style="font:500 15px 'DM Sans'">{t}</h3><p class="mut sm">{d}</p></div></div>
    {/each}
  </div>
</div></section>

<section class="sec alt"><div class="wrap g2" style="align-items:center;gap:40px">
  <div><span class="tag">A practical kitchen companion</span><h2>Less searching.<br><em>More lutong Pinoy.</em></h2><p class="mut" style="margin-top:12px">Built around the small decisions that make everyday cooking more resourceful.</p></div>
  <div class="g2">{#each perks as [i, t, d]}<div class="card"><div style="color:var(--or)">{i}</div><h3 style="font:500 14px 'DM Sans';margin:8px 0 4px">{t}</h3><p class="mut sm">{d}</p></div>{/each}</div>
</div></section>

<section class="sdg"><div class="wrap">
  <div class="n">12</div>
  <div><div class="sm" style="opacity:.8">Responsible consumption &amp; production</div><h3>A more resourceful kitchen starts with what’s already there.</h3></div>
  <p>FitSarap encourages better use of available food resources and helps reduce avoidable household food waste.</p>
</div></section>
