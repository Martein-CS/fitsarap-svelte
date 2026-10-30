<script lang="ts">
  import {page} from '$app/state';
  const notFound = $derived(page.status === 404);
</script>

<svelte:head><title>{notFound ? 'Not found' : 'Something went wrong'} | FitSarap</title></svelte:head>

<main id="main" class="page"><div class="wrap c" style="max-width:560px">
  <a href="/" class="logo" style="justify-content:center;margin-bottom:24px"><i aria-hidden="true">🍲</i>Fit<b>Sarap</b></a>
  <span class="tag">Error {page.status}</span>
  <h1 style="font-size:clamp(30px,4vw,44px)">{notFound ? 'We couldn’t find that page.' : 'Something went wrong.'}</h1>
  <p class="mut" style="margin:14px 0 22px">{notFound ? 'The recipe or page may have moved, or the link has a typo.' : 'Please try again in a moment.'}</p>
  {#if page.error?.id && !notFound}<p class="sm mut" style="margin-bottom:18px">Reference: <code>{page.error.id}</code></p>{/if}
  <div class="chips" style="justify-content:center"><a class="btn" href="/find">Find recipes</a><a class="btn out" href="/">Go home</a></div>
</div></main>
