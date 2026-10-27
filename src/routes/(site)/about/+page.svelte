<script lang="ts">
  const cards = [['🥣', 'Reduce food waste', 'Find ways to use available ingredients instead of leaving them unused.'], ['🛒', 'Reduce unnecessary purchases', 'Prioritize recipes that require fewer additional ingredients.'], ['✦', 'Support practical meal decisions', 'Help households and students decide what to cook from what they have.']];
</script>

<svelte:head><title>About | FitSarap</title></svelte:head>

<section class="page"><div class="wrap">
  <div class="cta" style="padding:44px;margin:0 0 20px">
    <div><span class="tag">Made for everyday Filipino kitchens</span><h1 style="font-size:clamp(34px,5vw,54px)">Cook smarter.<br><em style="color:var(--gr2)">Waste less.</em></h1><p class="mut" style="margin:12px 0 20px;max-width:380px">FitSarap helps you discover Filipino dishes that make better use of ingredients already at home.</p><a class="btn" href="/find">Find a recipe →</a></div>
    <div class="sdg" style="width:200px;height:200px;border-radius:50%;display:grid;place-items:center;text-align:center;padding:0"><div><div class="serif" style="font-size:72px;line-height:1;color:#f7e56a">12</div><div style="font-size:10px;letter-spacing:.1em">RESPONSIBLE<br>CONSUMPTION</div></div></div>
  </div>
  <div class="g3">{#each cards as [i, t, d]}<div class="card"><div style="color:var(--or)">{i}</div><h3 style="font:500 15px 'DM Sans';margin:8px 0 4px">{t}</h3><p class="mut sm">{d}</p></div>{/each}</div>
  <div style="margin-top:44px;padding-top:36px;border-top:1px solid var(--ln);max-width:520px"><span class="tag">UN Sustainable Development Goal 12</span><h2>Small kitchen choices, meaningful impact.</h2><p class="mut" style="margin-top:8px">FitSarap supports more responsible household food consumption by encouraging better use of existing ingredients and reducing avoidable food waste.</p></div>
</div></section>
