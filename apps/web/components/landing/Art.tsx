/** Simple flat product drawings. Original artwork, drawn with brand tints so no photos are needed to load. */
type P = { className?: string };
const base = { viewBox: '0 0 120 120', fill: 'none', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const Fridge = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="34" y="10" width="52" height="100" rx="8" fill="#42A5F5" fillOpacity=".16" stroke="#42A5F5" />
    <path d="M34 46h52" stroke="#42A5F5" />
    <path d="M44 24v12M44 58v18" stroke="#fff" strokeWidth="4" />
  </svg>
);
export const Tv = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="12" y="24" width="96" height="62" rx="8" fill="#EF5350" fillOpacity=".16" stroke="#EF5350" />
    <path d="M40 104h40M60 86v18" stroke="#EF5350" />
    <path d="M26 66l22-18 16 12 14-10 16 14" stroke="#fff" strokeOpacity=".7" />
  </svg>
);
export const Sofa = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="22" y="30" width="76" height="34" rx="12" fill="#66BB6A" fillOpacity=".16" stroke="#66BB6A" />
    <rect x="10" y="52" width="100" height="34" rx="12" fill="#66BB6A" fillOpacity=".16" stroke="#66BB6A" />
    <path d="M24 86v12M96 86v12" stroke="#66BB6A" />
  </svg>
);
export const Phone = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="36" y="8" width="48" height="104" rx="10" fill="#EF5350" fillOpacity=".16" stroke="#EF5350" />
    <circle cx="60" cy="98" r="4" stroke="#fff" />
    <path d="M52 20h16" stroke="#fff" />
    <circle cx="60" cy="52" r="12" stroke="#fff" strokeOpacity=".7" />
  </svg>
);
export const Fan = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="60" cy="48" r="34" fill="#42A5F5" fillOpacity=".12" stroke="#42A5F5" />
    <path d="M60 48c-4-14 2-24 12-22 6 12-2 22-12 22zM60 48c14-4 24 2 22 12-12 6-22-2-22-12zM60 48c4 14-2 24-12 22-6-12 2-22 12-22zM60 48c-14 4-24-2-22-12 12-6 22 2 22 12z" stroke="#fff" strokeOpacity=".8" />
    <path d="M60 82v22M40 108h40" stroke="#42A5F5" />
  </svg>
);
export const Microwave = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="10" y="28" width="100" height="64" rx="9" fill="#66BB6A" fillOpacity=".14" stroke="#66BB6A" />
    <rect x="20" y="38" width="56" height="44" rx="6" stroke="#fff" strokeOpacity=".75" />
    <path d="M92 44v0M92 60v0M92 76v0" stroke="#fff" strokeWidth="6" />
  </svg>
);
export const Generator = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="14" y="30" width="92" height="62" rx="8" fill="#EF5350" fillOpacity=".14" stroke="#EF5350" />
    <path d="M26 92v10M94 92v10M14 56h92" stroke="#EF5350" />
    <path d="M62 36l-10 14h10l-6 14" stroke="#fff" strokeWidth="4" />
  </svg>
);

export const PRODUCTS = [
  { name: 'Fridges', Art: Fridge },
  { name: 'TVs', Art: Tv },
  { name: 'Sofas', Art: Sofa },
  { name: 'Phones', Art: Phone },
  { name: 'Fans', Art: Fan },
  { name: 'Microwaves', Art: Microwave },
  { name: 'Generators', Art: Generator },
] as const;
