# House style

Every reel follows this. It overrides the overlay table in SKILL.md step 4
and the sound and zoom details elsewhere in SKILL.md. The values that the
code enforces live in `remotion/src/talk/style.tsx`; change them there and
here together.

## Enforced by the code (style.tsx)

A timeline that asks for a forbidden overlay or sound renders nothing for it.

- **Sound: off.** No card pops, whooshes or thuds. The soft tap on zoom
  snaps is also off (`sfx.snap`). Voice only.
- **Captions:** the whole phrase appears at once (not word by word), lowercase,
  no end punctuation, yellow-cream `#F2E58A` with a firm dark shadow for legibility on light walls, size 70, two balanced lines, no background,
  centred at y 580 (upper third). A phrase ends at punctuation, a pause over
  0.35 s, or 8 words. While an image card is up the captions slide to y 1380.
- **Allowed overlays:** `ImageCard` (flat rectangle, top centre, 560 px wide, its bottom edge sits at y 620 above the head and it grows upward, never above y 270: a
  photo, a screenshot, or a plain white quote card; put images in
  `remotion/public/cards/`), `LogoRow` (logo chips on spoken names), `EndCard`.
- **Off by default, per video on request:** `Big` (number card). Turn it on
  for one reel when the user asks ("use number cards in this one").
- **Not allowed:** emoji, memes, polaroids of the other takes, big logo,
  stamp list, quote card, strike-through, tree card, prompt card, REC badge,
  GitHub card, hero chips.
- **Music:** none rendered in. The user adds a quiet track in Instagram.

## Followed by whoever plans the reel (not enforced by code)

- **No custom overlays in the timeline file.** Everything on screen comes from
  the gated components in `overlays.tsx` / `reel-overlays.tsx`. Never write an
  emoji character or a new card component in `Reel.tsx`: it bypasses the
  gates. The end card is the one exception, and it must use the caption look
  (yellow text with the style shadow, no box, no emoji, above the head).
  `scripts/check-style.sh` fails on any emoji in the timeline; run it before
  every render.
- **Language:** all on-screen text in the speaker's language (Portuguese for
  Portuguese recordings). No em dashes.
- **One thing at a time:** one card on screen at once, nothing in the first
  half second of a sentence, gone 0.3 s after the sentence.
- **Cards only when they add something:** an image card for a quote, a photo
  or a screenshot the user gave (never invented). Most sentences stay bare.
- **Zoom:** snaps between 1.0 and 1.1 at cuts only (not inside takes), 3 to 5
  slow push-ins per minute at most.
- **Close:** a frozen last frame with the `EndCard`, 3 s.

## How to change it

- Want sound back, or emoji, or memes: set the flag in `style.tsx`
  (`sfx.enabled`, `allow.emoji`, ...) and edit the lists above.
- Want a different card size or position: `big` in `style.tsx`.
- References: put reels you like in `~/Documents/Reels/references/` and ask
  Claude to compare the style against them.
