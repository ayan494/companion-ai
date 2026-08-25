import { cn } from "@/lib/utils";

interface BrandIconProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function BrandIcon({ size = "md", className }: BrandIconProps) {
  const containerSizes = {
    sm: "h-7 w-7 rounded-lg",
    md: "h-9 w-9 rounded-xl",
    lg: "h-12 w-12 rounded-2xl",
    xl: "h-16 w-16 rounded-3xl",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
    xl: "h-9 w-9",
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-cyan-500 via-teal-500 to-blue-600 shadow-md shadow-cyan-500/20 transition-transform duration-200 hover:scale-105",
        containerSizes[size],
        className,
      )}
    >
      {/* Subtle inner highlight border */}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/25" />

      {/* Modern Ion Geometric SVG Vector */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]", iconSizes[size])}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ionGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.8" />
          </linearGradient>
          <filter id="coreBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Orbital Ring 1 */}
        <ellipse
          cx="16"
          cy="16"
          rx="12.5"
          ry="5.5"
          transform="rotate(-28 16 16)"
          stroke="url(#ionGlow)"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Outer Orbital Ring 2 */}
        <ellipse
          cx="16"
          cy="16"
          rx="12.5"
          ry="5.5"
          transform="rotate(38 16 16)"
          stroke="url(#ionGlow)"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Central Core Nucleus with Glow */}
        <circle cx="16" cy="16" r="3.2" fill="#FFFFFF" filter="url(#coreBlur)" />
        <circle cx="16" cy="16" r="2" fill="#0284C7" opacity="0.9" />

        {/* Orbital Quantum Energy Particles */}
        <circle cx="26" cy="11" r="1.4" fill="#FFFFFF" opacity="0.95" />
        <circle cx="6" cy="21" r="1.2" fill="#FFFFFF" opacity="0.9" />
        <circle cx="23" cy="23" r="1.3" fill="#E0F2FE" opacity="0.95" />
      </svg>
    </div>
  );
}

export function BrandLogo({ size = "md", showText = true, className }: BrandLogoProps) {
  const textSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <BrandIcon size={size} />
      {showText && (
        <span className={cn("font-semibold tracking-tight text-foreground flex items-center gap-1", textSizes[size])}>
          <span>Ion</span>
          <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent font-medium">
            Chat
          </span>
        </span>
      )}
    </div>
  );
}
