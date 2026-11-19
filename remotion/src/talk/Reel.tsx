import React from "react";
import { AbsoluteFill, Easing, Freeze, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import segSpec from "./reel-segments.json";
import wordsRaw from "./reel-words.json";
import face from "./reel-face.json";
import { FONT, Word } from "./overlays";
import { EndCard, ReelCaptions } from "./reel-overlays";

// IMG_9028: "comece com o que você tem" (planejar demais trava). One
// continuous take with no retakes, trimmed of the longer pauses between
// sentences (11 pieces). Speaker centred, face centre y ~800, grey wall
// behind. No product names, numbers or images, so the reel is captions,
// snaps on the cuts, a few push-ins and the end card. Captions placed
// automatically above the head (reel-face.json from scripts/headtop.py).
//
// Every time in this file is a second of the ORIGINAL recording.

const FPS = 30;
const SRC = "talk/ig1080.mp4";
type Seg = { a: number; b: number; frames: number; note?: string };
const SEGS = segSpec.segments as Seg[];
const SPEECH_FRAMES = SEGS.reduce((n, s) => n + s.frames, 0);
const OUTRO_FRAMES = Math.round(segSpec.outro * FPS);
export const REEL_DURATION = SPEECH_FRAMES + OUTRO_FRAMES;
const words = (Array.isArray(wordsRaw) ? wordsRaw : (wordsRaw as { words: Word[] }).words) as Word[];

const segStart = (i: number) => SEGS.slice(0, i).reduce((n, s) => n + s.frames, 0);

export const E = (t: number): number => {
  for (let i = 0; i < SEGS.length; i++) {
    const s = SEGS[i];
    if (t >= s.a - 1e-6 && t <= s.b + 1e-6) return segStart(i) + Math.round((t - s.a) * FPS);
  }
  throw new Error(`E(${t}): not inside any take in reel-segments.json`);
};

const ORIGIN = "50% 42%"; // the face
const ORIGIN_Y = 1920 * 0.42;

// Snap zooms at the cuts only (house style), alternating 1.0 / 1.1.
const SNAP_FRAMES: [number, number][] = SEGS.map((s, i) => [E(s.a), i % 2 === 0 ? 1.0 : 1.1]);

type Push = { at: number; z: number; up?: number; until: number | "end"; down?: number };
const PUSHES: Push[] = [
  { at: 5.9, z: 1.12, up: 14, until: 7.84 }, // "por causa de se planejar demais?"
  { at: 26.9, z: 1.1, up: 12, until: 28.93 }, // "seria muito mais efetivo"
  { at: 64.4, z: 1.12, up: 12, until: 66.3 }, // "simplesmente começam"
  { at: 78.5, z: 1.12, up: 16, until: "end" }, // "você terá muito mais resultados"
];

// strongest framing in the timeline, so the captions clear the head even then
const MAX_ZOOM = Math.max(...SNAP_FRAMES.map(([, z]) => z)) * Math.max(1, ...PUSHES.map((p) => p.z));

const useZoom = () => {
  const f = useCurrentFrame();
  let base = 1;
  for (const [fr, z] of SNAP_FRAMES) if (f >= fr) base = z;
  let push = 1;
  for (const p of PUSHES) {
    const a = E(p.at);
    const b = p.until === "end" ? REEL_DURATION : E(p.until);
    const up = p.up ?? 12;
    const down = p.down ?? 0;
    if (f < a || f >= b + down) continue;
    const rise = interpolate(f, [a, a + up], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    const fall = down > 0 ? interpolate(f, [b, b + down], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : f < b ? 1 : 0;
    push *= 1 + (p.z - 1) * rise * fall;
  }
  return base * push;
};

// End card (house style, see STYLE.md "End card"): his own words.
const END = { lead: "pare de planejar demais", punch: "saia da inércia" };

export const TalkReel: React.FC = () => {
  const zoom = useZoom();
  const last = SEGS[SEGS.length - 1];
  return (
    <AbsoluteFill style={{ background: "#000", fontFamily: FONT }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: ORIGIN }}>
        {SEGS.map((s, i) => {
          const from = Math.round(s.a * FPS);
          return (
            <Sequence key={i} from={segStart(i)} durationInFrames={s.frames} layout="none" name={`take ${i + 1}`}>
              <OffthreadVideo
                src={staticFile(SRC)}
                startFrom={from}
                endAt={from + s.frames}
                volume={(fr) => interpolate(fr, [0, 2, s.frames - 3, s.frames - 1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
                style={{ width: "100%", height: "100%" }}
              />
            </Sequence>
          );
        })}
        <Sequence from={SPEECH_FRAMES} durationInFrames={OUTRO_FRAMES} layout="none" name="outro freeze">
          <Freeze frame={last.frames - 1}>
            <OffthreadVideo src={staticFile(SRC)} startFrom={Math.round(last.a * FPS)} muted style={{ width: "100%", height: "100%" }} />
          </Freeze>
        </Sequence>
      </AbsoluteFill>

      <Sequence from={SPEECH_FRAMES} durationInFrames={OUTRO_FRAMES} layout="none" name="end card">
        <EndCard {...END} face={face} originY={ORIGIN_Y} maxZoom={MAX_ZOOM} />
      </Sequence>

      <ReelCaptions words={words} face={face} originY={ORIGIN_Y} maxZoom={MAX_ZOOM} />
    </AbsoluteFill>
  );
};
