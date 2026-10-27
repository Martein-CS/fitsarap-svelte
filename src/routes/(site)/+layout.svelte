<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import type {LayoutProps} from './$types';
  let {data, children}: LayoutProps = $props();
</script>

<Header user={data.user} />
{@render children()}
<Footer user={data.user} />
