export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c6cff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="#12122a" />
      <rect x="4" y="4" width="56" height="56" rx="16" fill="none" stroke="url(#logo-g)" strokeWidth="2.5" />
      <circle
        cx="32"
        cy="32"
        r="15"
        fill="none"
        stroke="url(#logo-g)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray="70 26"
        transform="rotate(-90 32 32)"
      />
      <circle cx="32" cy="32" r="5.5" fill="url(#logo-g)" />
    </svg>
  );
}

export function Logo({ size = 34, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {withWord && (
        <span className="text-[1.05rem] font-bold tracking-tight text-white">
          Focus<span className="text-gradient">Arena</span>
        </span>
      )}
    </span>
  );
}
