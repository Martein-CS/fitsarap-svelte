<script lang="ts">
  const steps = [
    ['Your ingredient input', 'Chicken — 500 g · Egg — 2 pcs · Rice — 500 g · Garlic — 5 cloves. English or Filipino names both work (manok, bawang, toyo, kakang gata).'],
    ['Name and quantity check', 'Each name is matched to one of about 1,000 standard ingredients and its family (liempo → pork belly → pork). Units are converted within the same kind (g/kg/lbs, ml/cups/tbsp) so amounts compare fairly; weight and volume are never mixed.'],
    ['Recipe database', '1,911 cleaned Filipino recipes (FitSarap dataset v5.1) with standardized ingredient names, quantities, units, servings, cooking times and steps.'],
    ['The FitSarap model', 'Each recipe gets a score: 40% TF-IDF similarity (which gives distinctive ingredients like tamarind or bagoong more weight than garlic or onion), 60% ingredient coverage (exact ingredient = full credit, same family = half), plus 10% for having enough quantity. Water, salt, black pepper and cooking oil are assumed to be in every kitchen.'],
    ['Why this model', 'We compared TF-IDF, Word2Vec, two Sentence-BERT models and two hybrids on 1,420 simulated pantries. This hybrid ranked recipes best (NDCG@5 0.938) and stayed best when pantries had fewer matching or more unrelated ingredients.'],
    ['Ingredient relationships', 'From the same recipes, FitSarap learns which ingredients are cooked together (for example tamarind, kangkong and labanos in sinigang). It uses this to suggest what else you might have, and to show the one missing item that would complete the most recipes.'],
    ['Ranked recommendations', 'Each match shows what you have, what is missing or short, substitutes you already own (from alternatives written by recipe authors), how many servings your amounts allow, and the full cooking steps. Allergy and diet exclusions hide recipes with matching ingredients.']];
</script>

<svelte:head><title>How it works | FitSarap</title></svelte:head>

<section class="page"><div class="wrap">
  <div class="c"><span class="tag">A recipe match, made understandable</span><h1>How Fit<span style="color:var(--or)">Sarap</span> finds <em>your recipes.</em></h1><p class="mut" style="margin:14px auto 0;max-width:460px">We turn a short list of ingredients into practical Filipino meal ideas.</p></div>
  <div class="how">{#each steps as [t, d], n}<div class="s" data-n={'0' + (n + 1)}><h3>{t}</h3><p class="mut sm">{d}</p></div>{/each}</div>
  <div class="cta"><div><span class="pill o">THINGS TO KNOW</span><h3 style="margin-top:8px;max-width:380px">Percentages show how many main ingredients you have. They are not model confidence, and allergy filters only check ingredient names.</h3></div><a class="btn" href="/find">Try your ingredients →</a></div>
</div></section>
