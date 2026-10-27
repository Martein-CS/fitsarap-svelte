import type {LayoutServerLoad} from './$types';
import {loadState} from '$lib/server/data';

// Runs for every page: shares the user, pantry, saved recipes and exclusions.
export const load: LayoutServerLoad = async (event) => {
  return {user: event.locals.user, ...(await loadState(event))};
};
