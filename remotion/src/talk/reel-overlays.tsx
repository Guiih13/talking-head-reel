import React from "react";
import {
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Card, Chip, FONT, MONO, Shadow, Word, ease } from "./overlays";
import { STYLE, StyleAudio, gate } from "./style";

// Overlay grammar for the VERTICAL (1080x1920) talking-head reel. The
// speaker is centred and fills the width, so there is no side column:
// cards live in a band between the chin and the captions, captions sit
// above the Instagram UI, and everything is short-lived.

export const REEL_W = 1080;
export const REEL_H = 1920;
export const CARD_X = 60; // cards keep clear of the IG action icons on the right (x > 940)
export const CARD_W = 870;
export const CARD_Y = 990; // below the chin at the strongest push-in
export const CAP_BOTTOM = 450; // captions bottom edge at y 1470, above the IG caption/audio strip
export const ACCENT = "#FFD166";
export const RED = "#FF453A";

// One sound effect at an edit frame.
export const Sfx: React.FC<{ at: number; src: string; vol?: number }> = ({ at, src, vol = 0.4 }) => {
  const ok = STYLE.sfx.enabled || (STYLE.sfx.snap && src === "tap.wav");
  if (!ok) return null;
  return (
    <Sequence from={at} durationInFrames={30} layout="none">
      <Audio src={staticFile(`sfx/${src}`)} volume={vol * STYLE.sfx.volume} />
    </Sequence>
  );
};

// House-style captions: the WHOLE phrase appears at once when its first word
// is spoken and goes when the phrase ends. Lowercase, no end punctuation,
// two balanced lines, cream, no background, upper third of the frame. While
// an image card is up (`lowerWhen`, edit frames) the captions slide down so
// the two never collide. All numbers come from STYLE.captions.
// lowercase the word and drop end punctuation, but leave money and numbers
// ("R$", "€", "2.300", "10x") exactly as spoken
const stripEnd = (w: string) => {
  const t = w.trim().replace(/[.,!?;:…]+$/, "");
  return /[\d$€£]/.test(t) ? t : t.toLowerCase();
};
const endsPhrase = (w: Word) => /[.?!,;:…]$/.test(w.word.trim()) || !!(w as Word & { brk?: boolean }).brk;

function buildPhrases(words: Word[]): Word[][] {
  const { maxWords, gap } = STYLE.captions;
  const phrases: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    if (endsPhrase(w) || !next || next.start - w.end > gap) {
      phrases.push(cur);
      cur = [];
    }
  });
  // cut anything longer than maxWords into balanced chunks
  const out: Word[][] = [];
  for (const ph of phrases) {
    const k = Math.ceil(ph.length / maxWords);
    let a = 0;
    for (let c = 0; c < k; c++) {
      const n = Math.ceil((ph.length - a) / (k - c));
      out.push(ph.slice(a, a + n));
      a += n;
    }
  }
  return out;
}

// split a phrase into two lines of similar length (one line when short)
function twoLines(texts: string[]): string[][] {
  if (texts.length <= 3) return [texts];
  let best = 1;
  let bestDiff = Infinity;
  for (let k = 1; k < texts.length; k++) {
    const d = Math.abs(texts.slice(0, k).join(" ").length - texts.slice(k).join(" ").length);
    if (d < bestDiff) { bestDiff = d; best = k; }
  }
  return [texts.slice(0, best), texts.slice(best)];
}

export const ReelCaptions: React.FC<{ words: Word[]; lowerWhen?: [number, number][]; bottom?: number; groupSize?: number; size?: number }> = ({
  words,
  lowerWhen = [],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const C = STYLE.captions;
  const phrases = React.useMemo(() => buildPhrases(words), [words]);
  const g = phrases.find((gr) => t >= gr[0].start - 0.05 && t < gr[gr.length - 1].end + 0.3);
  if (!g) return null;
  const a = ease(t, g[0].start - 0.05, g[0].start + 0.05);
  // 0 = upper third, 1 = lowered under an image card; eased over 8 frames
  const low = lowerWhen.reduce(
    (m, [f0, f1]) => Math.max(m, interpolate(frame, [f0 - 2, f0 + 6, f1 - 6, f1 + 2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })),
    0,
  );
  const cy = C.centerY + (C.loweredY - C.centerY) * low;
  const lines = twoLines(g.map((w) => stripEnd(w.word)));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: cy,
        transform: "translateY(-50%)",
        textAlign: "center",
        fontFamily: FONT,
        fontSize: C.size,
        fontWeight: 800,
        letterSpacing: -2,
        lineHeight: 1.12,
        color: C.color,
        textShadow: C.shadow,
        opacity: a,
        padding: "0 90px",
      }}
    >
      {lines.map((l, i) => (
        <div key={i}>{l.join(" ")}</div>
      ))}
    </div>
  );
};

// A flat image card, top centre: a photo, a screenshot, or (when `quote` is
// given and there is no `src`) a plain white quote card. No rounded corners.
// Put the image in public/cards/ and pass src="cards/name.png".
const ImageCardImpl: React.FC<{ life: number; src?: string; quote?: string; author?: string; w?: number; bottom?: number }> = ({
  life,
  src,
  quote,
  author,
  w = STYLE.imageCard.w,
  bottom = STYLE.imageCard.bottom,
}) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [0, 6, life - 6, life], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const maxH = bottom - STYLE.imageCard.minTop;
  return (
    <div
      style={{
        position: "absolute",
        left: (REEL_W - w) / 2,
        width: w,
        bottom: REEL_H - bottom, // anchored by its bottom edge, grows upward
        display: "flex",
        justifyContent: "center",
        opacity: a,
        transform: `translateY(${(1 - a) * -12}px)`,
      }}
    >
      <div style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.35)", background: "#f4f4f2", maxHeight: maxH, overflow: "hidden" }}>
        {src ? (
          <Img src={staticFile(src)} style={{ display: "block", maxWidth: w, maxHeight: maxH, objectFit: "contain" }} />
        ) : (
          <div style={{ width: w, padding: "44px 40px", boxSizing: "border-box", fontFamily: FONT, color: "#111", textAlign: "center" }}>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.2 }}>{quote ? `\u201C${quote}\u201D` : null}</div>
            {author ? <div style={{ fontSize: 30, marginTop: 22, fontWeight: 500 }}>{`\u2013 ${author}`}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
};
export const ImageCard = gate("imageCard", ImageCardImpl);

// A list that fills in line by line as the speaker lists things, then gets
// a rotated stamp slammed over it and every line struck through. For any
// list the speaker then dismisses.
const StampListImpl: React.FC<{
  life: number;
  lines: { text: string; at: number; icons?: { src: string; at: number; bg?: string; invert?: boolean }[] }[];
  stamp: string;
  stampAt: number;
  x?: number;
  y?: number;
  w?: number;
}> = ({ life, lines, stamp, stampAt, x = CARD_X, y = CARD_Y, w = CARD_W }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const st = spring({ frame: f - stampAt, fps, config: { damping: 12, stiffness: 220, mass: 0.6 } });
  const stampOn = f >= stampAt;
  return (
    <Card life={life} x={x} y={y} w={w} padding={30} style={{ paddingRight: 40 }}>
      {lines.map((l, i) => {
        const a = interpolate(f - l.at, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const strike = interpolate(f - stampAt - i * 3, [2, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={l.text}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 42,
              fontWeight: 600,
              opacity: a * (stampOn ? 0.75 : 1),
              transform: `translateX(${(1 - a) * 24}px)`,
              marginTop: i === 0 ? 0 : 14,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.45)", fontFamily: MONO, fontSize: 30 }}>{String(i + 1).padStart(2, "0")}</span>
            <span>{l.text}</span>
            {(l.icons ?? []).map((ic) => {
              const ia = spring({ frame: f - ic.at, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
              return (
                <span
                  key={ic.src}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 11,
                    background: ic.bg ?? "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    boxSizing: "border-box",
                    opacity: f >= ic.at ? ia : 0,
                    transform: `scale(${0.5 + 0.5 * ia})`,
                    marginLeft: 2,
                  }}
                >
                  <Img src={staticFile(ic.src)} style={{ width: "100%", height: "100%", objectFit: "contain", filter: ic.invert ? "invert(1)" : undefined }} />
                </span>
              );
            })}
            <div
              style={{
                position: "absolute",
                left: -6,
                top: "50%",
                height: 5,
                width: `${strike * 104}%`,
                background: RED,
                borderRadius: 3,
                transform: "translateY(-50%) rotate(-1.5deg)",
              }}
            />
          </div>
        );
      })}
      {stampOn ? (
        <div
          style={{
            position: "absolute",
            right: 30,
            top: -34,
            padding: "10px 26px",
            border: `6px solid ${RED}`,
            borderRadius: 16,
            color: RED,
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: 4,
            textTransform: "uppercase",
            transform: `rotate(-9deg) scale(${1.8 - 0.8 * st})`,
            opacity: st,
            background: "rgba(18,18,20,0.85)",
            boxShadow: Shadow,
          }}
        >
          {stamp}
        </div>
      ) : null}
    </Card>
  );
};

// A quote card: a small header (who said it), lines that appear as the
// speaker quotes them, and a final line in the accent colour that lands hard.
const QuoteCardImpl: React.FC<{
  life: number;
  header: string;
  headerIcon?: string;
  headerIconBg?: string;
  lines: { text: string; at: number; big?: boolean; sub?: boolean }[];
  x?: number;
  y?: number;
  w?: number;
}> = ({ life, header, headerIcon, headerIconBg, lines, x = CARD_X, y = CARD_Y, w = CARD_W }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Card life={life} x={x} y={y} w={w} padding={30}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, color: "rgba(255,255,255,0.6)", fontSize: 28, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
        {headerIcon ? (
          <span style={{ width: 44, height: 44, borderRadius: 10, background: headerIconBg ?? "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, boxSizing: "border-box" }}>
            <Img src={staticFile(headerIcon)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </span>
        ) : null}
        {header}
      </div>
      {lines.map((l) => {
        const s = spring({ frame: f - l.at, fps, config: { damping: l.big ? 11 : 14, stiffness: l.big ? 210 : 160, mass: 0.7 } });
        const on = f >= l.at;
        return (
          <div
            key={l.text}
            style={{
              fontSize: l.big ? 60 : l.sub ? 30 : 40,
              fontWeight: l.big ? 800 : l.sub ? 500 : 600,
              color: l.big ? ACCENT : l.sub ? "rgba(255,255,255,0.7)" : "#fff",
              letterSpacing: l.big ? -2 : 0,
              lineHeight: 1.15,
              marginTop: l.sub ? 6 : 12,
              opacity: on ? s : 0,
              transform: `translateY(${(1 - s) * 18}px) scale(${l.big ? 0.9 + 0.1 * s : 1})`,
              transformOrigin: "0 50%",
            }}
          >
            {l.text}
          </div>
        );
      })}
    </Card>
  );
};

// Big text that gets struck through a moment later ("not about AI agents").
const StrikeBigImpl: React.FC<{ life: number; text: string; strikeAt: number; x?: number; y?: number; size?: number }> = ({
  life,
  text,
  strikeAt,
  x = CARD_X,
  y = CARD_Y,
  size = 96,
}) => {
  const f = useCurrentFrame();
  const p = interpolate(f - strikeAt, [0, 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const xs = spring({ frame: f - strikeAt - 4, fps: 30, config: { damping: 10, stiffness: 240, mass: 0.5 } });
  return (
    <Card life={life} x={x} y={y} padding={32} style={{ paddingLeft: 44, paddingRight: 44 }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -size * 0.04, lineHeight: 1, whiteSpace: "nowrap", opacity: 1 - 0.45 * p }}>{text}</div>
        <div style={{ position: "absolute", left: -8, top: "50%", height: 8, width: `${p * 100}%`, maxWidth: "calc(100% - 100px)", background: RED, borderRadius: 4, transform: "translateY(-50%) rotate(-3deg)" }} />
        <div style={{ fontSize: size * 0.9, fontWeight: 900, color: RED, opacity: f >= strikeAt + 4 ? xs : 0, transform: `scale(${0.4 + 0.6 * xs}) rotate(${(1 - xs) * 30}deg)` }}>✗</div>
      </div>
    </Card>
  );
};

// A mono "tree" card for a file path that appears line by line.
const TreeCardImpl: React.FC<{ life: number; title: string; lines: string[]; stagger?: number; x?: number; y?: number; w?: number }> = ({
  life,
  title,
  lines,
  stagger = 4,
  x = CARD_X,
  y = CARD_Y,
  w = CARD_W,
}) => {
  const f = useCurrentFrame();
  return (
    <Card life={life} x={x} y={y} w={w} padding={30}>
      <div style={{ fontSize: 28, color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>{title}</div>
      {lines.map((l, i) => {
        const a = interpolate(f - 6 - i * stagger, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={l} style={{ fontFamily: MONO, fontSize: 38, fontWeight: 600, whiteSpace: "pre", opacity: a, transform: `translateX(${(1 - a) * 16}px)`, marginTop: 6 }}>
            {l}
          </div>
        );
      })}
    </Card>
  );
};

// A prompt being typed into a terminal-looking card, with a cursor and soft
// key ticks, and an optional second line that lands later.
const PromptCardImpl: React.FC<{
  life: number;
  prompt: string;
  cps?: number; // characters per second
  startAt?: number;
  after?: { text: string; at: number };
  x?: number;
  y?: number;
  w?: number;
}> = ({ life, prompt, cps = 42, startAt = 4, after, x = CARD_X, y = CARD_Y, w = CARD_W }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.max(0, Math.min(prompt.length, Math.floor(((f - startAt) / fps) * cps)));
  const done = n >= prompt.length;
  const cursorOn = Math.floor(f / 8) % 2 === 0 || !done;
  const ticks: number[] = [];
  for (let c = 6; c < prompt.length; c += 7) ticks.push(startAt + Math.round((c / cps) * fps));
  const afterA = after ? spring({ frame: f - after.at, fps, config: { damping: 13, stiffness: 190, mass: 0.6 } }) : 0;
  return (
    <Card life={life} x={x} y={y} w={w} padding={30} style={{ background: "rgba(10,10,12,0.95)", border: "1px solid rgba(255,255,255,0.12)" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: 18, height: 18, borderRadius: 999, background: c, display: "inline-block" }} />
        ))}
        <span style={{ marginLeft: 12, fontFamily: MONO, fontSize: 24, color: "rgba(255,255,255,0.5)" }}>claude</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 34, lineHeight: 1.35, color: "#fff", minHeight: 34 * 1.35 * 3 }}>
        <span style={{ color: "#34c759" }}>&gt; </span>
        {prompt.slice(0, n)}
        <span style={{ opacity: cursorOn ? 1 : 0, color: ACCENT }}>▍</span>
      </div>
      {after ? (
        <div style={{ fontFamily: MONO, fontSize: 32, color: ACCENT, marginTop: 14, opacity: f >= after.at ? afterA : 0, transform: `translateY(${(1 - afterA) * 14}px)` }}>
          {after.text}
        </div>
      ) : null}
      {ticks.map((t) => (
        <Sfx key={t} at={t} src="tick.wav" vol={0.22} />
      ))}
    </Card>
  );
};

// A blinking REC badge with a running timer, for "recording", "filming",
// "here I am on camera".
const RecBadgeImpl: React.FC<{ life: number; x?: number; y?: number }> = ({ life, x = 720, y = 300 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 14, stiffness: 180, mass: 0.6 } });
  const exit = interpolate(f, [life - 8, life], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blink = Math.floor(f / 15) % 2 === 0;
  const s = f / fps;
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(Math.floor(s % 60)).padStart(2, "0");
  const ff = String(f % fps).padStart(2, "0");
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 22px",
        borderRadius: 16,
        background: "rgba(18,18,20,0.9)",
        color: "#fff",
        fontFamily: MONO,
        fontSize: 34,
        fontWeight: 700,
        whiteSpace: "nowrap",
        boxShadow: Shadow,
        opacity: Math.min(enter, exit),
        transform: `scale(${0.8 + 0.2 * enter})`,
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: 999, background: RED, opacity: blink ? 1 : 0.25, boxShadow: blink ? `0 0 16px ${RED}` : undefined }} />
      REC {mm}:{ss}:{ff}
    </div>
  );
};

// A row of polaroid-style stills from the other takes ("a few tries").
const TakesImpl: React.FC<{ life: number; stills: { src: string; label: string; at: number; tilt?: number }[]; x?: number; y?: number; w?: number }> = ({
  life,
  stills,
  x = CARD_X,
  y = CARD_Y,
  w = 200,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(f, [life - 8, life], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", gap: 26, fontFamily: FONT }}>
      {stills.map((s, i) => {
        const e = spring({ frame: f - s.at, fps, config: { damping: 11, stiffness: 200, mass: 0.6 } });
        const a = f < s.at ? 0 : Math.min(e, exit);
        return (
          <div
            key={s.src}
            style={{
              width: w,
              padding: 10,
              paddingBottom: 12,
              background: "#fff",
              borderRadius: 10,
              boxShadow: Shadow,
              opacity: a,
              transform: `rotate(${s.tilt ?? (i % 2 ? 3 : -4)}deg) scale(${0.6 + 0.4 * e}) translateY(${(1 - e) * 30}px)`,
            }}
          >
            <Img src={staticFile(s.src)} style={{ width: "100%", display: "block", borderRadius: 4 }} />
            <div style={{ textAlign: "center", fontSize: 26, fontWeight: 700, color: "#111", marginTop: 8, fontFamily: MONO }}>{s.label}</div>
            <Sequence from={s.at} durationInFrames={20} layout="none">
              <StyleAudio src={staticFile("sfx/pop.wav")} volume={0.3 * STYLE.sfx.volume} />
            </Sequence>
          </div>
        );
      })}
    </div>
  );
};

// GitHub card for a repo that is being published: mark, title, and a
// bouncing "link below" arrow. Set `repo` once the repo exists.
const GitHubCardImpl: React.FC<{ life: number; title: string; sub: string; repo?: string; x?: number; y?: number; w?: number }> = ({ life, title, sub, repo, x = CARD_X, y = CARD_Y, w = CARD_W }) => {
  const f = useCurrentFrame();
  const bounce = Math.sin(f / 5) * 6;
  return (
    <Card life={life} x={x} y={y} w={w} padding={30} style={{ background: "#0d1117", border: "1px solid #30363d" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Img src={staticFile("icons/github.svg")} style={{ width: 72, height: 72, filter: "invert(1)" }} />
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#e6edf3", letterSpacing: -1 }}>{title}</div>
          <div style={{ fontSize: 28, color: "#8b949e", marginTop: 4 }}>{repo ?? sub}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, color: ACCENT, fontSize: 36, fontWeight: 700 }}>
        <span style={{ display: "inline-block", transform: `translateY(${bounce}px)` }}>↓</span> link below
      </div>
    </Card>
  );
};

// End card over the frozen last frame.
const EndCardImpl: React.FC<{ life: number; name: string; line: string; url: string; repo?: string }> = ({ life, name, line, url, repo }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 4, fps, config: { damping: 14, stiffness: 150, mass: 0.8 } });
  const dim = interpolate(f, [0, 12], [0, 0.55], { extrapolateRight: "clamp" });
  void life;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${dim})` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, fontFamily: FONT, opacity: s, transform: `translateY(${(1 - s) * 30}px)` }}>
        <div style={{ background: "rgba(255,255,255,0.97)", color: "#111", borderRadius: 30, padding: "40px 50px", boxShadow: Shadow, textAlign: "center", width: 900, boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <Img src={staticFile("icons/github.svg")} style={{ width: 70, height: 70 }} />
            <div style={{ fontFamily: MONO, fontSize: 60, fontWeight: 700, letterSpacing: -2 }}>{name}</div>
          </div>
          <div style={{ fontSize: 34, color: "#555", marginTop: 16, fontWeight: 500 }}>{line}</div>
          {repo ? <div style={{ fontFamily: MONO, fontSize: 28, color: "#111", marginTop: 18, fontWeight: 600, background: "#f1f1f3", borderRadius: 12, padding: "10px 16px", display: "inline-block", whiteSpace: "nowrap" }}>{repo}</div> : null}
          <div style={{ fontSize: 40, color: "#111", marginTop: 22, fontWeight: 800 }}>↓ link below</div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 30, fontWeight: 600, letterSpacing: 1 }}>{url}</div>
      </div>
    </>
  );
};

// ---- the top-right "reaction" slot: next to the head, on the wall ----
// A big logo that appears on its name and is gone a second later.
export const REACT_X = 750;
export const REACT_Y = 270;
const BigLogoImpl: React.FC<{ life: number; src: string; bg?: string; size?: number; pad?: number; x?: number; y?: number; invert?: boolean }> = ({
  life,
  src,
  bg = "#fff",
  size = 300,
  pad = 0,
  x = REACT_X,
  y = REACT_Y,
  invert,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 9, stiffness: 190, mass: 0.7 } });
  const exit = interpolate(f, [life - 7, life], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const sc = enter * exit;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size * 0.22,
        background: bg,
        boxShadow: Shadow,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: pad,
        boxSizing: "border-box",
        opacity: Math.min(1, sc * 1.5),
        transform: `scale(${sc}) rotate(${(1 - enter) * -14}deg)`,
        transformOrigin: "50% 50%",
      }}
    >
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "contain", filter: invert ? "invert(1)" : undefined }} />
      <Sequence from={0} durationInFrames={20} layout="none">
        <StyleAudio src={staticFile("sfx/pop.wav")} volume={0.4 * STYLE.sfx.volume} />
      </Sequence>
    </div>
  );
};

// A big emoji with no background, popping in with a wobble.
const BigEmojiImpl: React.FC<{ life: number; emoji: string; size?: number; x?: number; y?: number }> = ({ life, emoji, size = 300, x = REACT_X, y = REACT_Y }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 8, stiffness: 170, mass: 0.7 } });
  const exit = interpolate(f, [life - 7, life], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const wobble = Math.sin(f / 2.2) * 6 * Math.max(0, 1 - f / 14);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.82,
        lineHeight: 1,
        opacity: Math.min(1, enter * exit * 1.5),
        transform: `scale(${enter * exit}) rotate(${wobble}deg)`,
        transformOrigin: "50% 60%",
        filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.35))",
      }}
    >
      {emoji}
      <Sequence from={0} durationInFrames={20} layout="none">
        <StyleAudio src={staticFile("sfx/pop.wav")} volume={0.4 * STYLE.sfx.volume} />
      </Sequence>
    </div>
  );
};

// A meme image in the reaction slot: white border, slight tilt, pop in,
// shrink out. Width fixed, height follows the image.
const MemeImpl: React.FC<{ life: number; src: string; w?: number; x?: number; y?: number; tilt?: number; delay?: number }> = ({
  life,
  src,
  w = 280,
  x = REACT_X,
  y = REACT_Y,
  tilt = -4,
  delay = 0,
}) => {
  const f = useCurrentFrame() - delay;
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 10, stiffness: 200, mass: 0.7 } });
  const exit = interpolate(f, [life - delay - 7, life - delay], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const sc = f < 0 ? 0 : enter * exit;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        padding: 8,
        background: "#fff",
        borderRadius: 14,
        boxShadow: Shadow,
        opacity: Math.min(1, sc * 1.5),
        transform: `scale(${sc}) rotate(${tilt + (1 - enter) * 16}deg)`,
        transformOrigin: "50% 40%",
      }}
    >
      <Img src={staticFile(src)} style={{ width: "100%", display: "block", borderRadius: 8 }} />
      <Sequence from={delay} durationInFrames={20} layout="none">
        <StyleAudio src={staticFile("sfx/pop.wav")} volume={0.35 * STYLE.sfx.volume} />
      </Sequence>
    </div>
  );
};

// Two or three big chips that bounce in and keep floating, for the close.
const HeroChipsImpl: React.FC<{ life: number; chips: Chip[]; size?: number; x?: number; y?: number; gap?: number }> = ({ life, chips, size = 220, x = CARD_X, y = CARD_Y, gap = 40 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(f, [life - 10, life], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", gap, fontFamily: FONT }}>
      {chips.map((c, i) => {
        const at = c.at ?? i * 10;
        const t = f - at;
        const enter = spring({ frame: t, fps, config: { damping: 8, stiffness: 160, mass: 0.8 } });
        const floatY = Math.sin(t / 9 + i) * 9;
        const rot = Math.sin(t / 13 + i * 2) * 4;
        const a = t < 0 ? 0 : Math.min(enter, exit);
        return (
          <div key={c.label} style={{ opacity: a, transform: `scale(${0.4 + 0.6 * enter}) translateY(${(1 - enter) * 60 + floatY}px) rotate(${rot}deg)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: size, height: size, borderRadius: size * 0.24, background: c.bg ?? "#fff", boxShadow: Shadow, display: "flex", alignItems: "center", justifyContent: "center", padding: c.pad ?? size * 0.2, boxSizing: "border-box" }}>
              {c.src ? <Img src={staticFile(c.src)} style={{ width: "100%", height: "100%", objectFit: "contain", filter: c.invert ? "invert(1)" : undefined }} /> : c.text}
            </div>
            {c.label ? (
              <div style={{ fontSize: 36, fontWeight: 700, color: "#111", background: "rgba(255,255,255,0.92)", padding: "8px 22px", borderRadius: 16, boxShadow: "0 4px 14px rgba(0,0,0,0.12)", whiteSpace: "nowrap" }}>{c.label}</div>
            ) : null}
            <Sequence from={at} durationInFrames={20} layout="none">
              <StyleAudio src={staticFile("sfx/pop.wav")} volume={0.42 * STYLE.sfx.volume} />
            </Sequence>
          </div>
        );
      })}
    </div>
  );
};

// Style gates: each overlay renders only when STYLE.allow says so.
export const StampList = gate("stampList", StampListImpl);
export const QuoteCard = gate("quoteCard", QuoteCardImpl);
export const StrikeBig = gate("strikeBig", StrikeBigImpl);
export const TreeCard = gate("treeCard", TreeCardImpl);
export const PromptCard = gate("promptCard", PromptCardImpl);
export const RecBadge = gate("recBadge", RecBadgeImpl);
export const Takes = gate("takes", TakesImpl);
export const GitHubCard = gate("githubCard", GitHubCardImpl);
export const EndCard = gate("endCard", EndCardImpl);
export const BigLogo = gate("bigLogo", BigLogoImpl);
export const BigEmoji = gate("emoji", BigEmojiImpl);
export const Meme = gate("meme", MemeImpl);
export const HeroChips = gate("heroChips", HeroChipsImpl);
