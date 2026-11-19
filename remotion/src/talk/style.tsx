import React from "react";
import { Audio } from "remotion";

// The house style. Every reel reads this; the components below enforce it, so
// a timeline that asks for something the style forbids simply renders nothing
// for it. The human-readable version of these rules is STYLE.md at the repo root.
// Change a value here and every future reel follows.
export const STYLE = {
  // Sound: off by default. Turn `enabled` on to hear card pops and whooshes;
  // `snap` is the soft tap on each zoom snap, separate because it is the one
  // sound most people keep.
  sfx: { enabled: false, snap: false, volume: 1 },

  // Which overlay components may appear. A false here makes the component
  // render null, whatever the timeline asks for.
  allow: {
    big: false, // big number / key phrase card (turn on per video when it needs prices or numbers)
    imageCard: true, // flat image / quote card, top centre
    logoRow: true, // logo chips on spoken names
    endCard: true,
    bigLogo: false, // one huge logo next to the head
    emoji: false,
    meme: false,
    takes: false, // polaroids of the other takes
    stampList: false,
    quoteCard: false,
    strikeBig: false,
    treeCard: false,
    promptCard: false,
    recBadge: false,
    githubCard: false,
    heroChips: false,
  },

  // Captions: whole phrase at once, lowercase, cream, no background. Never on
  // the speaker. `position` (overridable per reel on <ReelCaptions>):
  //   "auto"   talking head: above the head when two lines fit between the IG
  //            title bar (topMin) and the head top at the strongest zoom, else
  //            on the chest (bottomY). Needs reel-face.json (scripts/headtop.py).
  //   "top" / "bottom"  forced; "top" still centres in the space above the head.
  //   "middle" travel / b-roll clips (walking with the phrase): centre of the screen.
  // In the top position they slide to bottomY while an image card is up.
  captions: {
    color: "#F2E58A",
    size: 70,
    shadow: "0 2px 4px rgba(0,0,0,0.55), 0 4px 24px rgba(0,0,0,0.65)",
    position: "auto" as "auto" | "top" | "bottom" | "middle",
    topMin: 270, // below the IG title bar
    headGap: 30, // air between the last line and the hair
    centerY: 440, // "top" when no head measurement exists
    bottomY: 1380, // chest, above the IG caption strip (ends ~1470)
    middleY: 960,
    maxWords: 8,
    gap: 0.35,
  },
  // End card: lead line over a big punch, in the caption look, 3 s on the frozen last frame.
  endCard: { leadSize: 62, punchSize: 112, maxWidth: 900, dim: 0.5, seconds: 3 },

  // bottom edge of the card sits at y `bottom` (a gap above the head); the card grows upward
  // and never goes higher than `minTop` (the Instagram title bar covers the top ~250 px)
  imageCard: { w: 560, bottom: 620, minTop: 270 },

  // The one card everything else is measured against. Size is a ceiling: long
  // text shrinks to fit the card width, short text keeps this size, so every
  // card in a reel has the same size unless the text will not fit.
  big: { size: 96, x: 60, y: 270, maxWidth: 782, accentColors: false },
} as const;

export type AllowKey = keyof typeof STYLE.allow;

// Audio that is silent when the style has sound off.
export const StyleAudio: React.FC<React.ComponentProps<typeof Audio>> = (props) =>
  STYLE.sfx.enabled ? <Audio {...props} /> : null;

// Wrap an overlay so it renders only when the style allows it.
export function gate<P extends object>(flag: AllowKey, C: React.ComponentType<P>): React.FC<P> {
  const Gated: React.FC<P> = (p) => (STYLE.allow[flag] ? <C {...p} /> : null);
  Gated.displayName = `gate(${flag})`;
  return Gated;
}
