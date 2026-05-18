---
name: map-marker-ux
description: |
  UX principles and best practices for designing map markers on mobile apps.
  Use when designing, fixing or reviewing pins/markers/cards on maps in
  React Native (especially with react-native-maps + clustering). Covers
  visual hierarchy, legibility, density management, tier differentiation,
  animation discipline, and Android-specific rendering pitfalls.
---

# Map Marker UX — Mobile

Principles for designing markers that users can actually parse on a small screen
with limited zoom, dense data, and a colored background (the map itself).

## 1. Visual hierarchy (most important)

A user looking at a map scans markers in this order:
1. **Shape** — circle vs pin vs square reads in <100ms
2. **Color** — saturation differentiates tiers
3. **Size** — bigger = more important
4. **Icon/emoji** — read after the user fixates
5. **Text** — only read after a deliberate look

Apply: rank promoted vs non-promoted by *shape change*, not text. A square
among circles wins attention before any color or label does.

## 2. The "rule of one" per marker

A single marker should communicate ONE primary thing. Adding photo + name +
badge + tier color + animation + glow + count badge produces a "Christmas tree"
that the user filters out as noise.

If you need to show 4+ things, the marker is too small — open a sheet/modal.

Apply: at far zoom show ONLY tier (color). At close zoom show photo + name.
Never show all 5 things at once on a 60×60 marker.

## 3. Density and overlap

A marker is a hit target competing with neighbors. Rules:

- **Min spacing**: 8px between marker edges at the current zoom
- **Cluster threshold**: if 2+ markers would overlap, cluster them
- **Promoted bypass**: promoted markers can override clustering, BUT then they
  must be visually distinct enough that a stack of 3 promoted-cards doesn't
  produce visual chaos
- **Max card width on map**: 50% of viewport width. Anything wider blocks the
  map itself — defeats the purpose of being on a map

Apply: a 180×155 card on a 360px-wide screen takes 50% of the screen. With
2 promoted events nearby they'll *overlap and look broken*. Either shrink the
card, or use a smaller representation when neighbors exist.

## 4. Text legibility on maps

Maps have varied backgrounds (roads, parks, satellite). Rules:

- **Min font size**: 11pt on the map, 13pt for primary text
- **Always use a background plate** for text — never draw text directly on the
  map. The plate must have ≥4.5:1 contrast with its text.
- **Bold (700+ weight)** at small sizes
- **Single line**, truncate with ellipsis. Multi-line labels on map = users
  ignore them
- **Max 22 characters** visible per label. Long names get truncated

Apply: every marker label needs an opaque white/colored card behind it.
Light shadow under the card to lift it from the map.

## 5. Color and tier differentiation

Don't rely on color alone — 8% of men are color-blind. Combine:

- **Color** (the tier color)
- **Shape modifier** (ring, star, border thickness)
- **Position modifier** (badge in corner)
- **Text label** (BRONZE/PRATA/OURO in card mode)

Apply: tier badges must include the emoji 🥉🥈🥇 *and* the text *and* the color.
Don't make a user infer "this gold one is Ouro."

## 6. Animation discipline

Animations on maps are tax on attention and battery. Rules:

- **Max 1 animated marker per viewport**. If 5 Ouro markers are visible, only
  pulse one (or none).
- **Pulsing > scaling** — opacity changes don't affect layout/clustering
  measurements. Scale changes break react-native-maps marker bounds (clipping).
- **Pulse duration ≥ 900ms** — faster feels frantic
- **Disable when zooming/panning** — animation while user is moving the map
  makes the map feel laggy
- **Never animate text** — no fade-in, no scale. Reads as a glitch.

Apply: at "distant" zoom with many markers, no animations. At "close" zoom
with 1-3 promoted markers visible, one subtle pulse is acceptable.

## 7. Touch target size

iOS HIG: 44×44 minimum. Material: 48×48 minimum. On a map with imprecise
finger placement: aim for **52×52 minimum**.

Apply: if the visible marker is smaller than 52×52, add invisible padding via
a wrapper View, OR use Marker's `hitSlop` (if supported). Never make users
"snipe" a 28px pin.

## 8. Anchor & coordinate accuracy

The "where is this thing actually?" point matters:

- **Pin shape** (gota d'água): anchor = `(0.5, 1)` — tip at bottom = exact location
- **Circle/square shape**: anchor = `(0.5, 0.5)` — center on the location
- **Card with tail**: anchor = `(0.5, 1)` — tail at bottom = location
- **Card without tail**: ambiguous — users won't know exact location, AVOID

Apply: always include a tail/tip on cards. Never use a borderless rectangle —
users can't tell which point of the rectangle marks the event location.

## 9. Android rendering pitfalls

react-native-maps + Android specifics:

- `overflow: hidden` + `elevation` → shadow disappears OR child clipping
  bugs. Choose one. Use overflow:hidden ONLY on the innermost child that
  needs clipping (e.g. the photo container).
- `transform: scale` on a `Marker` child → react-native-maps measures the
  Marker at *unscaled* size and clips visual overflow. Use opacity-only
  animations.
- `position: absolute` siblings → `zIndex` is unreliable across siblings.
  Render order (last child = on top) is reliable.
- `tracksViewChanges={false}` → marker becomes a static snapshot. Set to
  `true` until the marker's content (photos, animations) stabilizes, then
  flip to `false` for performance.
- Remote `<Image>` inside a Marker → the marker may snapshot before the
  image loads. Keep `tracksViewChanges=true` until `onLoad` fires.
- Negative top/right (badge extending outside parent) works ONLY if the
  parent doesn't have `overflow:hidden`.

## 10. Zoom-adaptive sizing (the right way)

A single marker design rarely works at all zoom levels. Hybrid by zoom:

- **Distant zoom** (city view): tiny markers, no text, no photo — just color
- **Medium zoom** (neighborhood): pin + 1-line label — name visible
- **Close zoom** (street): full card with photo + name + tier — richest UI

Transitions should be sharp (replace one component with another) — don't
animate between modes, it looks janky on Android.

Apply: pass `zoomTier` prop to the marker component, switch components based
on the tier. Each mode is independently optimized.

---

## Checklist for a new map marker design

Before shipping a marker, answer:

- [ ] Hit target ≥ 52×52?
- [ ] Anchor matches the visual "point" of the marker?
- [ ] Text on a contrasting plate (not floating on the map)?
- [ ] Truncates long names?
- [ ] Tier differentiated by shape AND color (not just color)?
- [ ] Animation: ≤ 1 per viewport, opacity-only, ≥ 900ms?
- [ ] At max density (5+ near each other) the design doesn't break visually?
- [ ] Photo has emoji fallback?
- [ ] `tracksViewChanges` waits for photo load?
- [ ] Card width ≤ 50% of viewport?
- [ ] No `overflow:hidden` + `elevation` on the same View?
- [ ] No `transform:scale` on the marker root?

---

## Common anti-patterns to avoid

1. **The "Christmas tree" marker** — every event has a star, a glow, a badge,
   a photo, a name, a count, a heart. The user sees noise.
2. **Card without tail** — user can't tell where on the map the event is.
3. **Animated text** — fade-in or scale-in on text reads as a glitch.
4. **Tiny photo (< 40px)** — at that size the photo is unrecognizable. Either
   make it big or replace with the emoji.
5. **White text on light map area** — invisible on roads, parks, beaches.
6. **Marker that grows beyond 200px** — covers other markers, blocks the map.
7. **Same marker design at all zoom levels** — over-detailed when zoomed out,
   under-detailed when zoomed in.
