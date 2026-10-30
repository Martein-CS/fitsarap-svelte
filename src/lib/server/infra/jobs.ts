// Asynchronous processing. Work the person does not need to wait for runs after the response is sent:
//   • background(): ctx.waitUntil, same Worker, right after the response.
//   • emit(): a Cloudflare Queue (EVENTS binding) consumed in batches by workers/jobs. Without the binding the event is
//     handled in the background of the current request instead, so nothing is lost in local dev or on a minimal setup.
import type {RequestEvent} from '@sveltejs/kit';
import {getDb} from '../repositories/db';
import {telemetry} from '../repositories/telemetry';
import {errorInfo, log} from './log';

export type TelemetryEvent = {type: 'ingredient_miss'; names: string[]};

type Ev = Pick<RequestEvent, 'platform' | 'locals' | 'cookies'>;

export function background(event: Pick<RequestEvent, 'platform' | 'locals'>, task: Promise<unknown>, what = 'task'): void {
  const safe = task.catch((e) => log('warn', 'background task failed', {what, reqId: event.locals.reqId, ...errorInfo(e)}));
  const ctx = event.platform?.context;
  if (ctx) ctx.waitUntil(safe); else void safe;
}

export function emit(event: Ev, msg: TelemetryEvent): void {
  const queue = event.platform?.env.EVENTS;
  if (queue) { background(event, queue.send(msg), 'queue.send'); return; }
  background(event, handleEvents([msg], getDb(event)), msg.type);
}

/** Shared by the inline fallback above and the queue consumer in workers/jobs. */
export async function handleEvents(batch: TelemetryEvent[], db: Parameters<typeof telemetry.recordMisses>[0] | null): Promise<void> {
  if (!db) return;
  const names = batch.flatMap((m) => (m.type === 'ingredient_miss' ? m.names : []))
    .map((n) => n.toLowerCase().trim().slice(0, 60)).filter(Boolean);
  if (names.length) await telemetry.recordMisses(db, names);
}
