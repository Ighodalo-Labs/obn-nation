import {
  CircleCheck, CircleX, CookingPot, Ellipsis, Laptop, Package, PackageOpen, Refrigerator, Smartphone, Sofa, Sparkles, ThumbsUp, TriangleAlert, Tv, Zap, Hand,
} from 'lucide-react';
import { AGES, CATEGORIES, REGIONS, WORKING } from '@/lib/listing/schema';

const size = 24;
const categoryIcons = {
  phones: <Smartphone size={size} />, computers: <Laptop size={size} />, tvs: <Tv size={size} />, fridges: <Refrigerator size={size} />,
  generators: <Zap size={size} />, kitchen: <CookingPot size={size} />, furniture: <Sofa size={size} />, other: <Ellipsis size={size} />,
} as const;
const ageIcons = {
  new_sealed: <Package size={size} />, new_open_box: <PackageOpen size={size} />, premium_used: <Sparkles size={size} />,
  neatly_used: <ThumbsUp size={size} />, fairly_used: <Hand size={size} />,
} as const;
const workIcons = {
  working_perfectly: <CircleCheck size={size} />, minor_issues: <TriangleAlert size={size} />, not_working: <CircleX size={size} />,
} as const;

export const regionOptions = REGIONS.map((r) => ({ ...r, icon: null }));
export const categoryOptions = CATEGORIES.map((c) => ({ ...c, icon: categoryIcons[c.value] }));
export const ageOptions = AGES.map((a) => ({ ...a, icon: ageIcons[a.value] }));
export const workOptions = WORKING.map((w) => ({ ...w, icon: workIcons[w.value] }));
