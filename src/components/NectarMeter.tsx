// Whimsical Nectar Meter — a glowing tangerine slice energy indicator
// Replaces dry "2/5" energy readings with a visual brand-aligned meter

export function NectarMeter({ level, size = 40 }: { level: number; size?: number }) {
  const segments = [1, 2, 3, 4, 5];
  const r = 18;
  const cx = 22;
  const cy = 22;
  const viewBox = "0 0 44 44";

  // Calculate segment paths (5 wedges of a tangerine slice)
  const segmentPath = (index: number, total: number): string => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    const nextAngle = ((index + 1) / total) * Math.PI * 2 - Math.PI / 2;
    const sr = r - 2;
    const innerR = r * 0.45;
    const x1 = cx + sr * Math.cos(angle);
    const y1 = cy + sr * Math.sin(angle);
    const x2 = cx + sr * Math.cos(nextAngle);
    const y2 = cy + sr * Math.sin(nextAngle);
    const ix1 = cx + innerR * Math.cos(angle);
    const iy1 = cy + innerR * Math.sin(angle);
    const ix2 = cx + innerR * Math.cos(nextAngle);
    const iy2 = cy + innerR * Math.sin(nextAngle);
    return `M ${ix1} ${iy1} L ${x1} ${y1} A ${sr} ${sr} 0 0 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1} Z`;
  };

  return (
    <svg width={size} height={size} viewBox={viewBox} className="drop-shadow-sm" aria-label={`Energy level ${level} out of 5`}>
      {/* Base circle */}
      <circle cx={cx} cy={cy} r={r} fill="#fef3e2" stroke="#dad4c6" strokeWidth="0.5" />
      
      {/* Outer rind */}
      <circle cx={cx} cy={cy} r={r + 1.5} fill="none" stroke="#c26901" strokeWidth="2" opacity="0.15" />
      
      {/* Segments */}
      {segments.map((seg) => {
        const isActive = level >= seg;
        return (
          <path
            key={seg}
            d={segmentPath(seg - 1, 5)}
            fill={isActive
              ? seg <= 2
                ? "#fca5a5"
                : seg === 3
                  ? "#fbbf24"
                  : seg === 4
                    ? "#da9202"
                    : "#c26901"
              : "#f5ede0"
            }
            stroke={isActive ? "#c26901" : "#dad4c6"}
            strokeWidth="0.5"
            opacity={isActive ? 1 : 0.6}
            style={{
              transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              transformOrigin: `${cx}px ${cy}px`,
            }}
          />
        );
      })}

      {/* Center pip */}
      <circle cx={cx} cy={cy} r={2.5} fill="#dad4c6" opacity="0.4" />
      
      {/* Subtle shine overlay */}
      <circle cx={cx} cy={cy} r={r} fill="url(#nectar-shine)" opacity="0.15" />
      <defs>
        <radialGradient id="nectar-shine" cx="35%" cy="30%">
          <stop offset="0%" stopColor="white" stopOpacity="0.8" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Label */}
      <text x={cx} y={cy + 0.75} textAnchor="middle" fontSize="6" fontWeight="600" fill="#2c1802" opacity="0.7">
        {level}
      </text>
    </svg>
  );
}