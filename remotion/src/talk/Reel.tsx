import React from "react";
import { AbsoluteFill, Easing, Freeze, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import segSpec from "./reel-segments.json";
import wordsRaw from "./reel-words.json";
import { Big, FONT, Shadow, Word } from "./overlays";
import { STYLE } from "./style";
import { ACCENT, BigEmoji, QuoteCard, ReelCaptions, Sfx, StrikeBig } from "./reel-overlays";

// IMG_4626: perfumes comprados em Paris (Guerlain Cherry Oud, Liquides
// Imaginaires Bloody Wood). One continuous take, trimmed of repeats and
// pauses. The speaker sits low in the frame (face centre y ~960) and holds
// the bottles at chest height on the right, so the cards live on the empty
// wall ABOVE the head, captions sit just above the hair, and reactions go
// on the wall left of the head. Nothing covers the bottles.
//
// Every time in this file is a second of the ORIGINAL recording.

const FPS = 30;
const SRC = "talk/ig1080.mp4";
type Seg = { a: number; b: number; frames: number; note?: string };
const SEGS = segSpec.segments as Seg[];
const SPEECH_FRAMES = SEGS.reduce((n, s) => n + s.frames, 0);
const OUTRO_FRAMES = Math.round(segSpec.outro * FPS);
export const REEL_DURATION = SPEECH_FRAMES + OUTRO_FRAMES;
const words = wordsRaw as Word[];

const segStart = (i: number) => SEGS.slice(0, i).reduce((n, s) => n + s.frames, 0);

export const E = (t: number): number => {
  for (let i = 0; i < SEGS.length; i++) {
    const s = SEGS[i];
    if (t >= s.a - 1e-6 && t <= s.b + 1e-6) return segStart(i) + Math.round((t - s.a) * FPS);
  }
  throw new Error(`E(${t}): not inside any take in reel-segments.json`);
};
const rel = (t: number, from: number) => E(t) - E(from);
const life = (from: number, to: number) => E(to) - E(from);

const At: React.FC<{ from: number; to: number; children: React.ReactNode; name?: string }> = ({ from, to, children, name }) => (
  <Sequence from={E(from)} durationInFrames={E(to) - E(from)} name={name} layout="none">
    {children}
  </Sequence>
);

// layout for this recording
const TOP_X = 60;
const TOP_Y = 270; // cards on the wall above the head (hair top ~y 680 at 1.1)
const TOP_W = 870;
const CAP_BOTTOM_PX = 1920 - 665; // caption bottom edge at y 665, just above the hair
const EMO = { x: 30, y: 720, size: 270 }; // wall left of the head
const ORIGIN = "50% 48%"; // the face

// Snap zooms: every cut, plus sentence starts inside the long takes.
// Alternates 1.0 / 1.08 (1.08 not 1.1: the bottles reach the right edge).
const INNER_SNAPS = [4.56, 7.4, 52.3, 67.4, 79.76, 130.0, 168.86, 172.06];
const SNAP_FRAMES: [number, number][] = [...SEGS.map((s) => E(s.a)), ...INNER_SNAPS.map(E)]
  .sort((p, q) => p - q)
  .map((fr, i) => [fr, i % 2 === 0 ? 1.0 : 1.08]);

type Push = { at: number; z: number; up?: number; until: number | "end"; down?: number };
const PUSHES: Push[] = [
  { at: 59.8, z: 1.1, up: 14, until: 61.3 }, // "Cherry Oud com o meu nome" (the bottle)
  { at: 87.3, z: 1.08, up: 10, until: 88.78 }, // "notas de vinho"
  { at: 102.6, z: 1.12, up: 12, until: 104.25 }, // "estou apaixonado"
  { at: 146.4, z: 1.1, up: 10, until: 148.9 }, // "sempre esqueço o nome"
  { at: 158.1, z: 1.1, up: 16, until: "end" }, // "comenta aí pra parte 2"
];

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

// End card over the frozen last frame: the call to action he said.
const PerfumeEnd: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 4, fps, config: { damping: 18, stiffness: 140, mass: 0.8 } });
  const dim = interpolate(f, [0, 12], [0, 0.5], { extrapolateRight: "clamp" });
  const C = STYLE.captions;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${dim})` }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 250,
          textAlign: "center",
          fontFamily: FONT,
          opacity: s,
          transform: `translateY(${(1 - s) * 20}px)`,
          textShadow: C.shadow,
          letterSpacing: -2,
        }}
      >
        <div style={{ fontSize: 110, fontWeight: 800, lineHeight: 1.05, color: C.color }}>comenta aí</div>
        <div style={{ fontSize: 62, fontWeight: 800, marginTop: 14, color: C.color }}>que vem a parte 2</div>
        <div style={{ fontSize: 36, fontWeight: 600, marginTop: 44, color: "rgba(255,255,255,0.88)", letterSpacing: 0, lineHeight: 1.45 }}>
          Guerlain Cherry Oud
          <br />
          Liquides Imaginaires Bloody Wood
        </div>
      </div>
    </>
  );
};

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
                volume={(f) => interpolate(f, [0, 2, s.frames - 3, s.frames - 1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
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

      {SNAP_FRAMES.slice(1).map(([fr]) => (
        <Sfx key={`snap-${fr}`} at={fr} src="tap.wav" vol={0.2} />
      ))}

      {/* "primeiro dia aqui em Paris" */}

      {/* "escolhi primeiro dois perfumes ... na Islândia" */}
      <At from={8.44} to={11.25} name="2 perfumes">
        <Big life={life(8.44, 11.25)} x={TOP_X} y={TOP_Y} text="2 perfumes" sub="para a Islândia" size={96} />
      </At>

      {/* "quando eu viajo eu não levo perfume" */}
      <At from={18.4} to={19.4} name="não levo">
        <StrikeBig life={life(18.4, 19.4)} text="levo perfume" strikeAt={rel(18.84, 18.4)} x={TOP_X} y={TOP_Y} size={88} />
      </At>
      <Sfx at={E(18.84)} src="whoosh.wav" vol={0.3} />

      {/* perfume 1: "o Guerlain ... o Cherry Oud" (spans the cut) */}
      <At from={24.1} to={27.4} name="perfume 1">
        <QuoteCard
          life={life(24.1, 27.4)}
          header="perfume 1"
          x={TOP_X}
          y={TOP_Y}
          w={TOP_W}
          lines={[
            { text: "Guerlain", at: rel(24.26, 24.1) },
            { text: "Cherry Oud", at: rel(26.42, 24.1), big: true },
          ]}
        />
      </At>
      <Sfx at={E(26.42)} src="thud.wav" vol={0.45} />

      {/* "fiz a personalização dele ... consegui colocar o meu nome" */}
      <At from={30.9} to={32.55} name="personalização">
        <Big life={life(30.9, 32.55)} x={TOP_X} y={TOP_Y} text="personalização" size={88} />
      </At>

      {/* "comprei dentro da Galeries Lafayette" */}
      <At from={40.15} to={41.5} name="lafayette">
        <Big life={life(40.15, 41.5)} x={TOP_X} y={TOP_Y} text="Galeries Lafayette" sub="Paris" size={76} />
      </At>

      {/* "deu aproximadamente R$ 2.300 ... foi 330 euros ... já com as taxas" */}
      <At from={50.05} to={53.6} name="2300">
        <Big life={life(50.05, 53.6)} x={TOP_X} y={TOP_Y} text="R$ 2.300" sub="aproximadamente" size={110} accent={ACCENT} />
      </At>
      <At from={53.8} to={58.1} name="330 euros">
        <Big life={life(53.8, 58.1)} x={TOP_X} y={TOP_Y} text="€ 330" sub="já com as taxas" size={110} accent={ACCENT} />
      </At>


      {/* perfume 2: "procurando há muito tempo, que é o Bloody Wood" */}
      <At from={77.5} to={82.6} name="perfume 2">
        <QuoteCard
          life={life(77.5, 82.6)}
          header="perfume 2"
          x={TOP_X}
          y={TOP_Y}
          w={TOP_W}
          lines={[
            { text: "procurando há muito tempo", at: 0 },
            { text: "Bloody Wood", at: rel(80.82, 77.5), big: true },
          ]}
        />
      </At>
      <Sfx at={E(80.82)} src="thud.wav" vol={0.45} />

      {/* "tem notas de vinho" */}
      <At from={87.7} to={88.78} name="vinho">
        <Big life={life(87.7, 88.78)} x={TOP_X} y={TOP_Y} text="notas de vinho" size={92} />
      </At>

      {/* "estou apaixonado nesse perfume" */}

      {/* "um perfume bem unissex" */}
      <At from={108.9} to={109.92} name="unissex">
        <Big life={life(108.9, 109.92)} x={TOP_X} y={TOP_Y} text="unissex" size={100} />
      </At>


      {/* "vou estar usando bastante aqui na Islândia" */}

      {/* "dessa casa que eu sempre esqueço o nome, que é Liquides Imaginaires" */}
      <At from={147.55} to={148.9} name="casa">
        <Big life={life(147.55, 148.9)} x={TOP_X} y={TOP_Y} text="Liquides Imaginaires" size={70} />
      </At>

      {/* "recomendo muito" */}

      {/* "esses dois foram os escolhidos ... Guerlain Cherry Oud e Liquides Imaginaires Bloody Wood" */}
      <At from={171.9} to={175.72} name="escolhidos">
        <QuoteCard
          life={life(171.9, 175.72)}
          header="os escolhidos"
          x={TOP_X}
          y={TOP_Y}
          w={TOP_W}
          lines={[
            { text: "Guerlain Cherry Oud", at: rel(172.06, 171.9), big: true },
            { text: "Liquides Imaginaires Bloody Wood", at: rel(174.0, 171.9) },
          ]}
        />
      </At>

      {/* "pretendo comprar mais pelo menos 4 a 5 perfumes nessa viagem" */}
      <At from={161.1} to={163.25} name="4 a 5">
        <Big life={life(161.1, 163.25)} x={TOP_X} y={TOP_Y} text="+ 4 a 5" sub="perfumes nessa viagem" size={110} accent={ACCENT} />
      </At>

      {/* "comenta aí pra parte 2" */}

      <Sequence from={SPEECH_FRAMES} durationInFrames={OUTRO_FRAMES} layout="none" name="end card">
        <PerfumeEnd />
      </Sequence>

      <ReelCaptions words={words} bottom={CAP_BOTTOM_PX} />
    </AbsoluteFill>
  );
};
