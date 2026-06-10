/**
 * Five-pillar development radar. Server-rendered SVG — no client JS, no chart
 * library. Decorative (aria-hidden); the page renders an accessible text legend
 * alongside it so the data is never trapped in the picture.
 */
import type { PillarBand } from "../lib/devProfile";

interface RadarPillar {
  label: string;
  /** 0–100, or null when there's no data. */
  score: number | null;
  band: PillarBand;
}

function bandColor(band: PillarBand): string {
  switch (band) {
    case "standout":
    case "strong":
      return "#4A6318"; // grass dark
    case "on_track":
      return "#107A57"; // teal
    case "developing":
    case "emerging":
      return "#B45309"; // amber
    default:
      return "#9CA3AF"; // grey — no data
  }
}

export function PillarRadar({
  pillars,
  size = 320,
}: {
  pillars: RadarPillar[];
  size?: number;
}) {
  const n = pillars.length;
  if (n < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.32;
  const labelR = R * 1.34;

  const angleAt = (i: number) => ((-90 + (i * 360) / n) * Math.PI) / 180;
  const point = (i: number, v: number) => {
    const a = angleAt(i);
    return { x: cx + R * v * Math.cos(a), y: cy + R * v * Math.sin(a) };
  };
  const toPath = (v: (i: number) => number) =>
    pillars
      .map((_, i) => {
        const p = point(i, v(i));
        return `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  // Concentric guide rings.
  const rings = [0.25, 0.5, 0.75, 1].map((rv) => toPath(() => rv));

  // Data polygon: unknown pillars plot near the center so the shape shows a gap.
  const plotV = (i: number) => {
    const s = pillars[i]?.score;
    return s === null || s === undefined ? 0.12 : Math.max(0.04, s / 100);
  };
  const dataPath = toPath(plotV);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="max-w-full"
    >
      {rings.map((d, i) => (
        <path key={`ring-${i}`} d={d} fill="none" stroke="#1A141022" strokeWidth={1} />
      ))}
      {pillars.map((_, i) => {
        const edge = point(i, 1);
        return (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={edge.x}
            y2={edge.y}
            stroke="#1A141022"
            strokeWidth={1}
          />
        );
      })}

      <path d={dataPath} fill="#6B8E2333" stroke="#4A6318" strokeWidth={2} />

      {pillars.map((p, i) => {
        const v = plotV(i);
        const dot = point(i, v);
        const color = bandColor(p.band);
        const known = p.score !== null && p.score !== undefined;
        return (
          <circle
            key={`dot-${i}`}
            cx={dot.x}
            cy={dot.y}
            r={4}
            fill={known ? color : "#FFFFFF"}
            stroke={color}
            strokeWidth={known ? 0 : 1.5}
          />
        );
      })}

      {pillars.map((p, i) => {
        const a = angleAt(i);
        const lx = cx + labelR * Math.cos(a);
        const ly = cy + labelR * Math.sin(a);
        const dx = lx - cx;
        const anchor = dx > 6 ? "start" : dx < -6 ? "end" : "middle";
        const dy = ly < cy ? -2 : 11;
        return (
          <text
            key={`label-${i}`}
            x={lx}
            y={ly + dy}
            textAnchor={anchor}
            fontSize={11}
            fontWeight={600}
            fill="#1A1410"
          >
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}
