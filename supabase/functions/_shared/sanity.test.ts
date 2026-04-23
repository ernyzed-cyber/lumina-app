import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { makeSupabaseMock } from './test-helpers.ts';

Deno.test('makeSupabaseMock returns queued response', async () => {
  const { client } = makeSupabaseMock({
    profiles: { data: { id: 'u1', stars_balance: 50 }, error: null },
  });
  const result = await client.from('profiles').select('*').eq('id', 'u1');
  assertEquals(result.data, { id: 'u1', stars_balance: 50 });
});
