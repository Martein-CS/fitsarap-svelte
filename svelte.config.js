import adapter from '@sveltejs/adapter-cloudflare';
import {vitePreprocess} from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  // platformProxy gives `vite dev` access to the local D1 database defined in wrangler.jsonc
  kit: {adapter: adapter({platformProxy: {configPath: 'wrangler.jsonc'}})}
};
