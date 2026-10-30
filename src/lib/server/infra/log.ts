// Observability: one JSON object per log line. Cloudflare Workers Logs (enabled in wrangler.jsonc) indexes these
// fields, so requests can be filtered by route, status, duration or request id, and errors traced back to a request.
// Framework-free so the standalone Workers use the same format.

export type Level = 'debug' | 'info' | 'warn' | 'error';
export type Fields = Record<string, unknown>;

export function log(level: Level, msg: string, fields: Fields = {}): void {
  const line = JSON.stringify({level, msg, ts: new Date().toISOString(), ...fields});
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Measures named steps of a request; the totals go to the log line and the Server-Timing response header. */
export class Timer {
  private start = performance.now();
  private marks: [string, number][] = [];

  async time<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    const t = performance.now();
    try { return await fn(); } finally { this.marks.push([name, performance.now() - t]); }
  }

  get total() { return performance.now() - this.start; }

  serverTiming(): string {
    return [...this.marks, ['total', this.total] as [string, number]].map(([n, d]) => `${n};dur=${d.toFixed(1)}`).join(', ');
  }

  fields(): Fields {
    return Object.fromEntries([...this.marks.map(([n, d]) => [`ms_${n}`, +d.toFixed(1)]), ['ms', +this.total.toFixed(1)]]);
  }
}

export const errorInfo = (e: unknown): Fields =>
  e instanceof Error ? {error: e.message, stack: e.stack?.split('\n').slice(0, 6).join(' | ')} : {error: String(e)};
