import { z } from 'zod';

export const isoDate = z.iso.date('Data inválida (use AAAA-MM-DD)');

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter ao menos 8 caracteres')
  .max(72)
  .regex(/[A-Za-z]/, 'A senha deve conter letras')
  .regex(/\d/, 'A senha deve conter números');

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.email('E-mail inválido').trim().toLowerCase(),
    password: passwordSchema,
    birthDate: isoDate.optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
