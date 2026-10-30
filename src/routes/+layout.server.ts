import type {LayoutServerLoad} from './$types';
import {loadState} from '$lib/server/services/kitchen';

// Runs for every page: the user, the pantry (each name resolved to its standard ingredient, "manok" -> chicken),
// saved recipe ids and exclusions. Nothing is kept in the Worker between requests.
export const load: LayoutServerLoad = async (event) => ({user: event.locals.user, ...(await loadState(event))});
