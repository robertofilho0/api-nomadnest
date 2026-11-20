import { fromCents } from '../common/schemas.js';
import type { Space } from '../generated/prisma/client.js';

export function toSpaceResponse(space: Space) {
  const { pricePerDayCents, ...rest } = space;
  return { ...rest, pricePerDay: fromCents(pricePerDayCents) };
}
