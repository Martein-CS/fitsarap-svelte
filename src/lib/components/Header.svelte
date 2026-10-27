<script lang="ts">
  import {page} from '$app/state';
  import type {User} from '$lib/types';
  let {user}: {user: User | null} = $props();
  const links = [['/', 'Home'], ['/find', 'Find Recipes'], ['/matches', 'Matches'], ['/how', 'How It Works'], ['/about', 'About']];
</script>

<header class="top"><div class="wrap bar">
  <a href="/" class="logo"><i>🍲</i>Fit<b>Sarap</b></a>
  <nav>
    {#each links as [p, t]}<a href={p} class:on={page.url.pathname === p}>{t}</a>{/each}
    {#if user}<a href="/dashboard" class:on={page.url.pathname === '/dashboard'}>Dashboard</a>{/if}
  </nav>
  <span class="hdr-r">
    {#if user}
      <form method="POST" action="/logout"><button class="x sm">Log out</button></form>
    {:else}
      <a href="/login" class="sm">Log in</a>
    {/if}
    <a class="btn tan" href="/find">🍳 Start Cooking</a>
  </span>
</div></header>
