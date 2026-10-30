// Asynchronous processing (optional). Consumes the EVENTS queue in batches and runs scheduled housekeeping, so the
// website never waits for this work.
//   • queue: unrecognised ingredient names people typed → ingredient_misses table (tells the team what to add next)
//   • cron (daily): deletes expired sessions
// Without the queue, the website records the same events in the background of the request (src/lib/server/infra/jobs.ts).
//
//   npx wrangler queues create fitsarap-events
//   npx wrangler deploy -c workers/jobs/wrangler.jsonc
import type {D1Database, MessageBatch, ScheduledController} from '@cloudflare/workers-types';
import {handleEvents, type TelemetryEvent} from '../../src/lib/server/infra/jobs';
import {sessions} from '../../src/lib/server/repositories/sessions';
import {log, errorInfo} from '../../src/lib/server/infra/log';

interface Env { DB: D1Database }

export default {
  async queue(batch: MessageBatch<TelemetryEvent>, env: Env): Promise<void> {
    try {
      await handleEvents(batch.messages.map((m) => m.body), env.DB);
      batch.ackAll();
      log('info', 'jobs batch', {queue: batch.queue, size: batch.messages.length});
    } catch (e) {
      log('error', 'jobs batch failed', {queue: batch.queue, ...errorInfo(e)});
      batch.retryAll();
    }
  },

  async scheduled(_c: ScheduledController, env: Env): Promise<void> {
    const r = await sessions.purgeExpired(env.DB, Date.now());
    log('info', 'purged expired sessions', {deleted: r.meta.changes});
  }
};
