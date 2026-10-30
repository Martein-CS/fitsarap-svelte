import type {SubmitFunction} from '@sveltejs/kit';
import {notify} from './toast.svelte';

/** use:enhance helper: updates the page without a reload and shows a toast. */
export const withToast = (success?: string): SubmitFunction => () => async ({result, update}) => {
  await update({reset: false});
  if (result.type === 'failure') notify(String(result.data?.message ?? 'Something went wrong.'));
  else if (result.type === 'error') notify(result.error.message);
  else if (result.type === 'success' && success) notify(success);
};
