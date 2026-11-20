import { z } from 'zod';
import { isoDate } from '../auth/auth.schemas.js';
import { pagination } from '../common/schemas.js';

export const AMENITIES = [
  'wifi',
  'cafe',
  'ar_condicionado',
  'estacionamento',
  'sala_reuniao',
  'impressora',
  'cozinha',
  'armarios',
  'acessibilidade',
  'pet_friendly',
] as const;

const base = {
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(2000).optional(),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(200),
  capacity: z.number().int().min(1).max(500),
  pricePerDay: z.number().nonnegative().multipleOf(0.01),
  amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length).optional(),
  available: z.boolean().optional(),
};

export const createSpaceSchema = z.object(base).strict();
export const updateSpaceSchema = z
  .object(base)
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Informe ao menos um campo',
  });

const csvAmenities = z
  .string()
  .transform((s) =>
    s
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.enum(AMENITIES)));

export const listSpacesSchema = z
  .object({
    city: z.string().trim().optional(),
    search: z.string().trim().min(1).max(100).optional(),
    amenities: csvAmenities.optional(),
    minCapacity: z.coerce.number().int().min(1).optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    sortBy: z
      .enum(['pricePerDayCents', 'name', 'capacity', 'createdAt'])
      .default('pricePerDayCents'),
    order: z.enum(['asc', 'desc']).default('asc'),
    ...pagination,
  })
  .refine((q) => Boolean(q.from) === Boolean(q.to), {
    message: 'Informe from e to juntos para filtrar por disponibilidade',
    path: ['from'],
  })
  .refine((q) => !q.from || !q.to || q.to > q.from, {
    message: 'to deve ser posterior a from',
    path: ['to'],
  });

export const availabilitySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((q) => q.to > q.from, {
    message: 'to deve ser posterior a from',
    path: ['to'],
  });

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;
export type ListSpacesQuery = z.infer<typeof listSpacesSchema>;
export type AvailabilityQuery = z.infer<typeof availabilitySchema>;
