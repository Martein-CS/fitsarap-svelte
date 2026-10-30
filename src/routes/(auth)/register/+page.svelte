<script lang="ts">
  import {enhance} from '$app/forms';
  import Photo from '$lib/components/Photo.svelte';
  import {withToast} from '$lib/client/enhance';
</script>

<svelte:head><title>Register | FitSarap</title></svelte:head>

<main id="main" class="auth"><div class="ac">
  <div class="f">
    <a href="/" class="logo"><i>🍲</i>Fit<b>Sarap</b></a>
    <h2 style="font-size:28px">Register</h2>
    <form method="POST" use:enhance={withToast()}>
      <label for="a-name">Username</label><input id="a-name" name="username" required minlength="2" maxlength="40" autocomplete="username">
      <label for="a-email">Email</label><input id="a-email" name="email" type="email" required autocomplete="email">
      <label for="a-pass">Password (10+ characters)</label><input id="a-pass" name="password" type="password" required minlength="10" autocomplete="new-password">
      <label for="a-conf">Re-enter password</label><input id="a-conf" name="confirm" type="password" required minlength="10" autocomplete="new-password">
      <button class="btn" type="submit">Create Account</button>
    </form>
    <p class="sm">Already have an account? <a href="/login"><u>Sign in now</u></a></p>
    <p class="sm"><a href="/">Continue as Guest</a></p>
  </div>
  <Photo id="chicken-adobo" name="Chicken Adobo" category="Adobo & Paksiw" dish="adobo" />
</div></main>
