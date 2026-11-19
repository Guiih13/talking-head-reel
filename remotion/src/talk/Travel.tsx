import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { FONT, Word } from "./overlays";
import { ReelCaptions } from "./reel-overlays";

// Travel / b-roll clip with one phrase on it (house style: captions mid-screen).
// No speech in the clip, so the phrase is timed by hand: it appears at
// PHRASE_IN and stays to the end. The clip and its audio play untouched.
//
// IMG_1976: standing at the basalt canyon, camera rolls to the side at 0-2.5 s.

const FPS = 30;
const SRC = "travel/ig1080.mp4";
export const TRAVEL_SECONDS = 5.5;
export const TRAVEL_DURATION = Math.round(TRAVEL_SECONDS * FPS);

const PHRASE = "escrevendo a história que eu quero contar";
const PHRASE_IN = 0.6;

// one contiguous phrase in caption words, ending 0.3 s before the clip does
const phraseWords = (text: string, from: number, to: number): Word[] => {
  const ws = text.split(" ");
  const step = (to - from) / ws.length;
  return ws.map((w, i) => ({ word: w, start: from + i * step, end: from + (i + 1) * step }) as Word);
};
const words = phraseWords(PHRASE, PHRASE_IN, TRAVEL_SECONDS - 0.3);

export const TravelReel: React.FC = () => (
  <AbsoluteFill style={{ background: "#000", fontFamily: FONT }}>
    <OffthreadVideo src={staticFile(SRC)} style={{ width: "100%", height: "100%" }} />
    {/* "top" not "middle": once the camera rolls he lies across y 900-1260 */}
    <ReelCaptions words={words} position="top" />
  </AbsoluteFill>
);
