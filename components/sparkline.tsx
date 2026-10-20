export function Sparkline({ values }: { values: number[] }) {
  const width = 340;
  const height = 92;
  const max = Math.max(...values, 0);
  const top = 14;
  const bottom = 78;
  const xs = values.map((_, index) => 6 + (index * (width - 12)) / Math.max(values.length - 1, 1));
  const ys = values.map((value) => (max <= 0 ? bottom : bottom - (value / max) * (bottom - top)));

  let line = `M${xs[0]},${ys[0]}`;
  for (let index = 0; index < xs.length - 1; index += 1) {
    const mid = (xs[index] + xs[index + 1]) / 2;
    line += ` C${mid},${ys[index]} ${mid},${ys[index + 1]} ${xs[index + 1]},${ys[index + 1]}`;
  }
  const lastX = xs[xs.length - 1] ?? 334;
  const lastY = ys[ys.length - 1] ?? bottom;
  const fill = `${line} L${lastX},${height} L${xs[0] ?? 6},${height} Z`;

  return (
    <div className="chart" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="0.8">
            <stop offset="0" stopColor="#22d3ee" stopOpacity=".32" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="spark-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <g stroke="rgba(148,163,184,.12)">
          <line x1="0" y1="15.6" x2="340" y2="15.6" />
          <line x1="0" y1="46.8" x2="340" y2="46.8" />
          <line x1="0" y1="78" x2="340" y2="78" />
        </g>
        <path fill="url(#spark-fill)" d={fill} />
        <path fill="none" stroke="url(#spark-stroke)" strokeWidth="2.4" strokeLinecap="round" d={line} />
        <circle cx={lastX} cy={lastY} r="4" fill="#22d3ee" stroke="#0f172a" strokeWidth="2" />
        <line x1={lastX} y1={lastY} x2={lastX} y2={height} stroke="rgba(34,211,238,.35)" strokeDasharray="3 3" />
      </svg>
    </div>
  );
}
