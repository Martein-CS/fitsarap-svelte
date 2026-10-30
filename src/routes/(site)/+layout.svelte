<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import type {LayoutProps} from './$types';
  let {data, children}: LayoutProps = $props();
</script>

<a class="skip" href="#main">Skip to main content</a>
<Header user={data.user} />
<main id="main" tabindex="-1">{@render children()}</main>
<Footer user={data.user} />
