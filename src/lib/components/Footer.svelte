<script lang="ts">
  import type {User} from '$lib/domain/types';
  let {user}: {user: User | null} = $props();
</script>

<footer><div class="wrap">
  <a href="/" class="logo"><i>🍲</i>Fit<b>Sarap</b></a>
  <span>Cook Filipino meals with what you already have.</span>
  <span>{#if !user}<a href="/register">Create account</a> · {/if}Designed for thoughtful kitchens · SDG 12</span>
</div></footer>
