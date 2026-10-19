export function Sparkline() {
  return (
    <div className="chart" aria-hidden="true">
      <svg viewBox="0 0 340 92" preserveAspectRatio="none">
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
        <path
          fill="url(#spark-fill)"
          d="M6,60.8 C30,60.8 38,40.5 62,40.5 C86,40.5 92,65.5 117,65.5 C142,65.5 148,31.2 172,31.2 C196,31.2 202,54.6 227,54.6 C252,54.6 258,71.7 282,71.7 C306,71.7 314,45.2 334,45.2 L334,92.0 L6,92.0Z"
        />
        <path
          fill="none"
          stroke="url(#spark-stroke)"
          strokeWidth="2.4"
          strokeLinecap="round"
          d="M6,60.8 C30,60.8 38,40.5 62,40.5 C86,40.5 92,65.5 117,65.5 C142,65.5 148,31.2 172,31.2 C196,31.2 202,54.6 227,54.6 C252,54.6 258,71.7 282,71.7 C306,71.7 314,45.2 334,45.2"
        />
        <circle cx="334" cy="45.2" r="4" fill="#22d3ee" stroke="#0f172a" strokeWidth="2" />
        <line x1="334" y1="45.2" x2="334" y2="92" stroke="rgba(34,211,238,.35)" strokeDasharray="3 3" />
      </svg>
    </div>
  );
}
