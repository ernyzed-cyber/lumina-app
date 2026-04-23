// deno-lint-ignore-file no-explicit-any
export type QueryResult<T = any> = { data: T | null; error: any };

export function makeSupabaseMock(responses: Record<string, QueryResult | QueryResult[]>) {
  const calls: Array<{ table: string; op: string; args: unknown[] }> = [];
  const queueByTable: Record<string, QueryResult[]> = {};
  for (const [k, v] of Object.entries(responses)) {
    queueByTable[k] = Array.isArray(v) ? [...v] : [v];
  }
  const next = (table: string): QueryResult => {
    const q = queueByTable[table];
    if (!q || q.length === 0) return { data: null, error: new Error(`no mock for ${table}`) };
    return q.length === 1 ? q[0] : q.shift()!;
  };
  const chain = (table: string, op: string): any => {
    const record = (args: unknown[]) => calls.push({ table, op, args });
    const thenable = {
      then: (onRes: (r: QueryResult) => unknown) => Promise.resolve(next(table)).then(onRes),
    };
    const builder: any = new Proxy({}, {
      get: (_t, prop) => {
        if (prop === 'then') return thenable.then;
        return (...args: unknown[]) => { record([String(prop), ...args]); return builder; };
      },
    });
    return builder;
  };
  const client = {
    from: (table: string) => ({
      select: (...a: unknown[]) => chain(table, 'select').select(...a),
      insert: (...a: unknown[]) => chain(table, 'insert').insert(...a),
      update: (...a: unknown[]) => chain(table, 'update').update(...a),
      upsert: (...a: unknown[]) => chain(table, 'upsert').upsert(...a),
      delete: (...a: unknown[]) => chain(table, 'delete').delete(...a),
      rpc: (...a: unknown[]) => chain(table, 'rpc').rpc(...a),
    }),
    rpc: (fn: string, args?: unknown) => {
      calls.push({ table: `rpc:${fn}`, op: 'rpc', args: [args] });
      return Promise.resolve(next(`rpc:${fn}`));
    },
    auth: {
      getUser: () => Promise.resolve(next('auth.getUser')),
    },
  };
  return { client, calls };
}
