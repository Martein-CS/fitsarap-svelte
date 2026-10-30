<script lang="ts">
  import {page} from '$app/state';
  import type {User} from '$lib/domain/types';
  let {user}: {user: User | null} = $props();
  const links = [['/', 'Home'], ['/find', 'Find Recipes'], ['/matches', 'Matches'], ['/how', 'How It Works'], ['/about', 'About']];
  const here = (p: string) => (p === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(p));
</script>

<header class="top"><div class="wrap bar">
  <a href="/" class="logo" aria-label="FitSarap home"><i aria-hidden="true">🍲</i>Fit<b>Sarap</b></a>
  <nav aria-label="Main">
    {#each links as [p, t]}<a href={p} class:on={here(p)} aria-current={here(p) ? 'page' : undefined}>{t}</a>{/each}
    {#if user}<a href="/dashboard" class:on={here('/dashboard')} aria-current={here('/dashboard') ? 'page' : undefined}>Dashboard</a>{/if}
  </nav>
  <span class="hdr-r">
    {#if user}
      <span class="sm mut hide-sm">Hi, {user.username}</span>
      <form method="POST" action="/logout"><button class="x sm">Log out</button></form>
    {:else}
      <a href="/login" class="sm">Log in</a>
      <a href="/register" class="btn out sm-btn">Sign up</a>
    {/if}
    <a class="btn tan" href="/find"><span aria-hidden="true">🍳</span> Start Cooking</a>
  </span>
</div></header>
