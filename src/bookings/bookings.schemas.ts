import { z } from 'zod';
import { isoDate } from '../auth/auth.schemas.js';
import { pagination, uuidSchema } from '../common/schemas.js';

export const MAX_DAYS = 90;
const DAY_MS = 864e5;
const today = () => new Date().toISOString().slice(0, 10);

type Period = { startDate?: string; endDate?: string };

/** Regras de período compartilhadas pela criação e pela remarcação. */
const withPeriodRules = <T extends z.ZodType<Period>>(schema: T) =>
  schema
    .refine((d) => !d.startDate || !d.endDate || d.endDate > d.startDate, {
      message: 'A data final deve ser posterior à inicial',
      path: ['endDate'],
    })
    .refine((d) => !d.startDate || d.startDate >= today(), {
      message: 'A reserva não pode começar no passado',
      path: ['startDate'],
    })
    .refine(
      (d) =>
        !d.startDate ||
        !d.endDate ||
        new Date(d.endDate).getTime() - new Date(d.startDate).getTime() <=
          MAX_DAYS * DAY_MS,
      {
        message: `Uma reserva pode ter no máximo ${MAX_DAYS} dias`,
        path: ['endDate'],
      },
    );

export const createBookingSchema = withPeriodRules(
  z
    .object({
      spaceId: uuidSchema,
      startDate: isoDate,
      endDate: isoDate,
      notes: z.string().trim().max(500).optional(),
    })
    .strict(),
);

export const rescheduleSchema = withPeriodRules(
  z
    .object({ startDate: isoDate, endDate: isoDate })
    .partial()
    .strict()
    .refine((d) => Object.keys(d).length > 0, {
      message: 'Informe ao menos uma data',
    }),
);

export const listBookingsSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
  when: z.enum(['upcoming', 'past']).optional(),
  spaceId: uuidSchema.optional(),
  ...pagination,
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RescheduleInput = z.infer<typeof rescheduleSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsSchema>;
