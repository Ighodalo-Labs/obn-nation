import {
  CircleCheck, CircleX, CookingPot, Ellipsis, Hand, Laptop, MapPin, Package, PackageOpen, Refrigerator, Smartphone, Sofa, Sparkles, ThumbsUp, TriangleAlert, Tv, Zap,
} from 'lucide-react';
import { AGES, CATEGORIES, REGIONS, WORKING } from '@/lib/listing/schema';
import type { Tone } from './ui';

const size = 22;
const sw = 1.9;

/** Each option has a short example line in plain Nigerian marketplace words, and a colour so the tiles are easy to tell apart. */
const categoryMeta = {
  phones: { icon: <Smartphone size={size} strokeWidth={sw} />, hint: 'iPhone, Samsung, Tecno', tone: 'blue' },
  computers: { icon: <Laptop size={size} strokeWidth={sw} />, hint: 'Laptops, desktops', tone: 'green' },
  tvs: { icon: <Tv size={size} strokeWidth={sw} />, hint: 'Smart TV, LED, Hisense', tone: 'red' },
  fridges: { icon: <Refrigerator size={size} strokeWidth={sw} />, hint: 'Double door, chest freezer', tone: 'blue' },
  generators: { icon: <Zap size={size} strokeWidth={sw} />, hint: 'Small gen, Mikano, Sumec', tone: 'amber' },
  kitchen: { icon: <CookingPot size={size} strokeWidth={sw} />, hint: 'Gas cooker, blender, microwave', tone: 'red' },
  furniture: { icon: <Sofa size={size} strokeWidth={sw} />, hint: 'Sofa, bed, table', tone: 'green' },
  other: { icon: <Ellipsis size={size} strokeWidth={sw} />, hint: 'Anything else for the home', tone: 'ink' },
} as const satisfies Record<string, { icon: React.ReactNode; hint: string; tone: Tone }>;

const regionMeta = {
  port_harcourt: { hint: 'Rivers State', tone: 'red' },
  delta: { hint: 'Asaba, Warri, Sapele and around', tone: 'blue' },
  ekiti: { hint: 'Ado-Ekiti and around', tone: 'green' },
} as const satisfies Record<string, { hint: string; tone: Tone }>;

const ageMeta = {
  new_sealed: { icon: <Package size={size} strokeWidth={sw} />, hint: 'Never opened, still in the box', tone: 'green' },
  new_open_box: { icon: <PackageOpen size={size} strokeWidth={sw} />, hint: 'Opened, never used', tone: 'green' },
  premium_used: { icon: <Sparkles size={size} strokeWidth={sw} />, hint: 'Looks and works like new', tone: 'blue' },
  neatly_used: { icon: <ThumbsUp size={size} strokeWidth={sw} />, hint: 'Used, kept clean', tone: 'blue' },
  fairly_used: { icon: <Hand size={size} strokeWidth={sw} />, hint: 'Used, shows some wear', tone: 'amber' },
} as const satisfies Record<string, { icon: React.ReactNode; hint: string; tone: Tone }>;

const workMeta = {
  working_perfectly: { icon: <CircleCheck size={size} strokeWidth={sw} />, hint: '', tone: 'green' },
  minor_issues: { icon: <TriangleAlert size={size} strokeWidth={sw} />, hint: '', tone: 'amber' },
  not_working: { icon: <CircleX size={size} strokeWidth={sw} />, hint: '', tone: 'red' },
} as const satisfies Record<string, { icon: React.ReactNode; hint: string; tone: Tone }>;

export const regionOptions = REGIONS.map((r) => ({ ...r, ...regionMeta[r.value], icon: <MapPin size={size} strokeWidth={sw} /> }));
export const categoryOptions = CATEGORIES.map((c) => ({ ...c, ...categoryMeta[c.value] }));
export const ageOptions = AGES.map((a) => ({ ...a, ...ageMeta[a.value] }));
export const workOptions = WORKING.map((w) => ({ ...w, ...workMeta[w.value] }));
