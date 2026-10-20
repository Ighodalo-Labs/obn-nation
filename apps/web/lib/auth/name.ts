import { z } from 'zod';

/** Seller name rules (PRD SI-7): 2 to 80 characters, trimmed, one line. */
export const nameSchema = z.object({
  full_name: z
    .string()
    .transform((s) => s.replace(/\s+/g, ' ').trim())
    .pipe(z.string().min(2, 'Please enter at least 2 characters.').max(80, 'Please keep it under 80 characters.')),
});
