# Stage 5 — Companion Home v2 Mood Orb

**Date:** 2026-05-05
**Status:** approved in chat, implementation in progress
**Route:** `/__preview/home`

## Concept

Replace the v1 hero portrait collapse with a calm, centered presence screen. The Home screen should feel like opening a quiet private space where she is already there, breathing softly.

The companion is represented as a **Mood Orb**: a volumetric glowing sphere with a simple grayscale messenger-style female silhouette inside. The orb changes color by mood, breathes slowly, and reveals a short thought on long press.

## User Experience

1. User opens `/__preview/home`.
2. A theme-reactive background appears:
   - dark theme: charcoal void with warm radial light around the orb;
   - light theme: warm ivory field with pearl-like glow.
3. The orb sits in the center of the screen. It has layered mist, inner glow, soft rim light, and a schematic grayscale girl silhouette inside.
4. Under the orb: companion name in small caps and one thin mood/state line.
5. Bottom dock has three minimal dots: Home, Chat, Memories. Home is active.
6. Tap/click the orb to navigate to `/chat`.
7. Press and hold the orb for about 450ms to enter listen mode:
   - orb breathes louder;
   - a single latest thought fades in for 3 seconds;
   - then it fades away automatically.

## Mood Model

Mood stays mock-only and deterministic:

```ts
Math.floor(now / (4 * HOUR)) % 7
```

The existing moods remain: `thoughtful`, `warm`, `playful`, `missing-you`, `quiet`, `tender`, `curious`.

## Visual Direction

- Reference: Apple Vision Pro / Personas, but warmer and more intimate.
- No Auth Aurora reuse on the Home page.
- No scroll-collapse, sticky avatar, or memory stream on Home.
- Motion should be slow and meditative, not flashy.
- The silhouette is intentionally schematic, not a real portrait.

## Scope

In scope:
- Replace current `/__preview/home` layout with Mood Orb.
- Add orb component and CSS module.
- Add bottom dock component and CSS module.
- Add long-press interaction.
- Keep theme support through existing `.redesign-root[data-theme]` / `:root[data-redesign-theme]` selectors.

Out of scope:
- Production routing changes.
- Real assignment data.
- Voice input.
- Real Memories screen implementation.
- Removing v1 memory components; they can be reused later for `/memories`.

## Implementation Notes

- `Home.tsx` should become a small orchestrator: get mock state, render `CompanionOrb`, status text, and `OrbDock`.
- The existing `getMockHomeState()` remains the data source.
- The first quote memory is used as the long-press thought.
- `MoodAurora`, `HeroPortrait`, and `MemoryStream` are not used by Home v2.
- Navigation uses `useNavigate()` from `react-router-dom`.
- Reduced motion disables continuous breathing and uses static glow.

## Acceptance Criteria

- `/__preview/home` has no vertical scroll dependency.
- The girl no longer rolls/shrinks into a sticky avatar.
- The page still works in light/dark/auto preview theme.
- Tap/click orb navigates to `/chat`.
- Long-press orb reveals one thought for 3 seconds.
- `npx tsc -b` passes.
- `npx vite build` passes.
