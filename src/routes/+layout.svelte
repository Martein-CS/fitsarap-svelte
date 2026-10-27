<script lang="ts">
  import './layout.css';
  import {toast} from '$lib/toast.svelte';
  import type {LayoutProps} from './$types';
  let {children}: LayoutProps = $props();
</script>

{@render children()}
<div id="toast" class:show={toast.show} role="status" aria-live="polite">{toast.msg}</div>
