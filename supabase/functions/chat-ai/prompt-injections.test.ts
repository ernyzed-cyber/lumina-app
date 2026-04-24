import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildIntimacyBlock, buildGiftMemoriesBlock, buildSceneDirectiveBlock } from './prompt-injections.ts';

Deno.test('intimacy block at level <5 ru: regular relationship', () => {
  const s = buildIntimacyBlock(3.0, 'ru');
  assertStringIncludes(s, 'INTIMACY');
  assertStringIncludes(s, '3');
  assertStringIncludes(s, 'дружелюбно');
});

Deno.test('intimacy block at level 5-7 ru: flirt hints', () => {
  const s = buildIntimacyBlock(6.0, 'ru');
  assertStringIncludes(s, 'флиртовать');
});

Deno.test('intimacy block at level 8+ ru: explicit allowed', () => {
  const s = buildIntimacyBlock(8.5, 'ru');
  assertStringIncludes(s, 'откровенн');
});

Deno.test('intimacy block at level 8+ en: explicit allowed', () => {
  const s = buildIntimacyBlock(8.5, 'en');
  assertStringIncludes(s, 'explicit');
});

Deno.test('gift memories empty returns empty string', () => {
  assertEquals(buildGiftMemoriesBlock([], 'ru'), '');
});

Deno.test('gift memories formats top rows with summary', () => {
  const rows = [
    { summary: 'Он подарил мне розу 2026-04-20.', gift_ref: 'rose', intimacy_weight: 0.3, created_at: '2026-04-20T00:00:00Z' },
    { summary: 'Кольцо 2026-04-22.', gift_ref: 'ring', intimacy_weight: 2.4, created_at: '2026-04-22T00:00:00Z' },
  ];
  const s = buildGiftMemoriesBlock(rows, 'ru');
  assertStringIncludes(s, 'SHE REMEMBERS GIFTS');
  assertStringIncludes(s, 'розу');
  assertStringIncludes(s, 'Кольцо');
});

Deno.test('scene directive null returns empty string', () => {
  assertEquals(buildSceneDirectiveBlock(null, 'ru'), '');
});

Deno.test('scene directive first_night ru contains scene cue', () => {
  const s = buildSceneDirectiveBlock('first_night', 'ru');
  assertStringIncludes(s, 'SCENE');
  assertStringIncludes(s, 'первая ночь');
});

Deno.test('scene directive weekend_away en contains scene cue', () => {
  const s = buildSceneDirectiveBlock('weekend_away', 'en');
  assertStringIncludes(s, 'weekend');
});
