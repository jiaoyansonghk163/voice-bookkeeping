const HEIGHTS = [14, 26, 38, 18, 46, 28, 16, 40, 22, 34, 18, 30, 12];

export function Waveform() {
  return (
    <div className="waveform flex h-14 items-center justify-center gap-[6px]" aria-hidden="true">
      {HEIGHTS.map((height, index) => (
        <span
          key={index}
          style={{
            height,
            animationDelay: `${(index % 7) * 0.08}s`,
            animationDuration: `${0.8 + (index % 4) * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}
