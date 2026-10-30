<script lang="ts">
  import {enhance} from '$app/forms';
  import Photo from '$lib/components/Photo.svelte';
  import {withToast} from '$lib/client/enhance';
</script>

<svelte:head><title>Log in | FitSarap</title></svelte:head>

<main id="main" class="auth"><div class="ac">
  <Photo id="chicken-adobo" name="Chicken Adobo" category="Adobo & Paksiw" dish="adobo" />
  <div class="f">
    <a href="/" class="logo"><i>🍲</i>Fit<b>Sarap</b></a>
    <h2 style="font-size:28px">Login</h2>
    <p class="sm" style="text-align:left;margin-top:4px">Ready to cook? Start now!</p>
    <form method="POST" use:enhance={withToast()}>
      <label for="a-id">Username or Email</label><input id="a-id" name="identifier" required autocomplete="username">
      <label for="a-pass">Password</label><input id="a-pass" name="password" type="password" required autocomplete="current-password">
      <button class="btn" type="submit">Sign In</button>
    </form>
    <p class="sm">Don’t have an account? <a href="/register"><u>Register now</u></a></p>
    <p class="sm"><a href="/">Continue as Guest</a></p>
  </div>
</div></main>
