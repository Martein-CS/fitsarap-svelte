<script lang="ts">
  const steps = [['Your ingredient input', 'Chicken — 500 g · Egg — 2 pcs · Rice — 500 g · Garlic — 5 cloves'], ['Name and quantity check', 'Spelling, plurals and Filipino names are normalized, and units are converted (g/kg, ml/L, tbsp/tsp, cups) so amounts compare fairly.'], ['Recipe catalog', 'Over 1,900 Filipino recipes from the FILIPINO_RECIPES_2K_V2 dataset, each with its ingredients, quantities, servings, and cooking steps.'], ['Matching', 'A recipe is only shown if you have at least one of its main ingredients. It is then scored on how many required ingredients you have in enough quantity (water, salt, oil and similar staples are ignored). A trained ML ranking model is planned to replace this step.'], ['Ranked recommendations', 'Recipes with stronger compatibility and fewer missing items appear first.']];
</script>

<svelte:head><title>How it works | FitSarap</title></svelte:head>

<section class="page"><div class="wrap">
  <div class="c"><span class="tag">A recipe match, made understandable</span><h1>How Fit<span style="color:var(--or)">Sarap</span> finds <em>your recipes.</em></h1><p class="mut" style="margin:14px auto 0;max-width:460px">We turn a short list of ingredients into practical Filipino meal ideas.</p></div>
  <div class="how">{#each steps as [t, d], n}<div class="s" data-n={'0' + (n + 1)}><h3>{t}</h3><p class="mut sm">{d}</p></div>{/each}</div>
  <div class="cta"><div><span class="pill o">THINGS TO KNOW</span><h3 style="margin-top:8px;max-width:340px">Percentages are ingredient-coverage scores, not model confidence.</h3></div><a class="btn" href="/find">Try your ingredients →</a></div>
</div></section>
