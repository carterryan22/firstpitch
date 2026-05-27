/**
 * Tiny server-rendered SVG sparkline. No client JS, no chart library.
 */

export function Sparkline({
  points,
  width = 200,
  height = 48,
  stroke = "#0f766e",
  fill = "#0f766e22",
  lowerIsBetter = false,
}: {
  points: Array<{ x: number; y: number }>;
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  lowerIsBetter?: boolean;
}) {
  if (points.length < 2) {
    return (
      <div className="text-xs text-slate-400" style={{ width, height }}>
        Not enough data
      </div>
    );
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(...ys);
  const ymax = Math.max(...ys);
  const xspan = xmax - xmin || 1;
  const yspan = ymax - ymin || 1;
  const pad = 4;
  const px = (x: number) => pad + ((x - xmin) / xspan) * (width - 2 * pad);
  const py = (y: number) => height - pad - ((y - ymin) / yspan) * (height - 2 * pad);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${px(p.x)} ${py(p.y)}`).join(" ");
  const area = `${path} L ${px(xmax)} ${height - pad} L ${px(xmin)} ${height - pad} Z`;
  const last = points[points.length - 1]!;
  const first = points[0]!;
  const improved = lowerIsBetter ? last.y < first.y : last.y > first.y;
  const dot = improved ? "#15803d" : last.y === first.y ? "#0f766e" : "#b45309";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={area} fill={fill} stroke="none" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} />
      <circle cx={px(last.x)} cy={py(last.y)} r={3} fill={dot} />
    </svg>
  );
}
