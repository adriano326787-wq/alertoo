---
name: promo-marketing
description: |
  Marketing principles for promoted/sponsored content surfaces (map pins,
  cards, banners) where the user (event organizer) paid for visibility.
  Use alongside `map-marker-ux` when designing or fixing anything related
  to paid placements, tier-based promotion (bronze/silver/gold), or
  photo-based event marketing on map surfaces.
---

# Promoted Content Marketing — Map Pins

Principles for surfaces where a creator/organizer paid money to be more
visible. The user (organizer) is the customer of the promotion feature;
the visual treatment must reflect what they paid for.

## 1. Photo is the marketing asset

When an organizer uploads a promotion photo, that photo IS the ad they
paid for. Treating it as a decorative "thumbnail" wastes the ad spend.
Treat it as the hero:

- **Show the photo, completely**. Never crop it (`contain`, not `cover`).
  Cropping a paid photo is the equivalent of cutting off a billboard.
- **Give it dedicated, prominent real estate** — the photo area should
  be the largest single element of the pin, not a small inset.
- **Letterbox in tier color** if aspect ratio doesn't match — visually
  reinforces the tier while showing the full photo.
- **Always show the photo when present, at every zoom level**. Even at
  far zoom, a tiny visible thumbnail is better than no thumbnail (the
  organizer paid to be seen, not hidden).

## 2. Tier perceived value hierarchy

Bronze < Silver < Gold maps to entry-level → premium tiers. Visual
treatment must reinforce this hierarchy so:
- Users perceive the value differential and want to upgrade
- Organizers feel they got what they paid for

Apply:
- **Size**: Gold pin > Silver > Bronze (at the same zoom level)
- **Animation**: only Gold animates (scarce visual resource = premium)
- **Decoration**: Gold may have stars/glow effects, Silver may have a
  subtle border treatment, Bronze is clean and simple
- **Border thickness**: Gold 3px, Silver 2.5px, Bronze 2px
- **Tier badge prominence**: Gold tier badge is the most visible

## 3. "Inventory" mindset

A map is finite real estate. Promoted pins occupy paid inventory. Rules:
- Promoted pins should NEVER be clustered/hidden by other markers
- Promoted pins should ALWAYS be tappable (no occlusion by organic pins)
- If two promoted pins overlap, the higher tier wins zIndex
- Organic (non-promoted) events visually de-emphasize when promoted
  events exist nearby (e.g. smaller, lower opacity, less saturated)

## 4. Differentiation from organic

A user should be able to tell promoted vs organic in <500ms (faster
than reading). Vectors:
- **Shape**: promoted = card-like rectangle, organic = simple pin
- **Has photo**: promoted with photo > promoted without > organic
- **Has tier badge**: promoted always has 🥉/🥈/🥇, organic never
- **Has name label**: promoted name always visible when zoom permits
- **Border/frame**: promoted has visible tier-colored frame

## 5. Call-to-action affordance

Every promoted pin is essentially saying "tap me to learn more". The
visual design should invite the tap:
- **Tap target ≥ 60×60** for promoted pins (vs 52×52 for organic)
- **Visible "press hint"**: shadow, elevation, slight rounded edges
- **Photo invites tap**: small magnifier icon, or "tap to view" cue OK
- **Tier badge invites tap**: trophy iconography is "click-worthy"

## 6. Brand consistency across zoom levels

The promoted pin should be recognizable as "the same kind of thing"
across all zoom levels:
- Same color palette
- Same overall shape (e.g., rounded rectangle vs circle)
- Tier badge always present (just sized differently)
- Photo always present (if uploaded), just sized differently

A user who learned "the Bronze pin is a square with a brown border"
should recognize it whether it's 40px or 160px tall.

## 7. Conversion-optimized close-up

At close zoom, the promoted pin becomes a mini-poster/preview card.
This is the highest-converting state and deserves the richest design:
- Full photo, prominent (40%+ of card area)
- Tier badge with text label
- Event name, single line, bold, ≥13pt
- Tap target ≥ 80×80
- Subtle directional cue (tail/arrow) pointing to actual location

## 8. Trust signals

Tier badges (🥉🥈🥇) work as social proof — "this event paid to be
featured" is a weak but real positive signal. Reinforce:
- Always show badge prominently, never abbreviate to color only
- Use universally recognized medal iconography (gold/silver/bronze
  emojis are crosss-cultural)
- Avoid making badges look like ads/spam (no "SPONSORED" red banner)
- The word "OURO/PRATA/BRONZE" should be present in close-zoom mode

## 9. Photo aspect ratio robustness

Organizers upload random photos: portrait selfies, landscape posters,
square Instagram shots, ultra-wide event banners. The pin design must
handle ALL gracefully:
- Use `contain` (never `cover`) so no photo is ever cropped
- Use a 4:3 photo area (most common photo ratio) for least letterbox
- Tier-colored letterbox (semi-transparent tier color) so the empty
  space still feels intentional and "branded"
- Never distort with `stretch`

## 10. "Worth what they paid" test

Before shipping a promoted pin design, imagine the organizer who paid
3 credits for Gold opens the map and sees their event. Would they:
- Feel their photo was given prominent treatment? (it MUST be visible)
- See clear differentiation from free events?
- Recognize "their money got them something special"?
- Want to upgrade from Bronze → Silver → Gold next time?

If any answer is "no" or "meh", the design is failing the marketing
purpose, regardless of how technically correct the UX is.

---

## Anti-patterns to avoid

1. **Photo as tiny thumbnail** — defeats the paid placement entirely
2. **Cropping the photo** with `cover` — disrespects the ad spend
3. **Photo hidden at far zoom** — organizer paid to be seen everywhere
4. **Same visual treatment for all tiers** — kills upsell motivation
5. **Promoted pins clustered like organic** — they paid not to be hidden
6. **Aggressive "AD" banners** — feels spammy, hurts trust
7. **Animations on every tier** — Gold loses its premium feel
8. **Tier badge as small footnote** — should be prominent trust signal
