const Booking = require('../models/Booking');
const Space = require('../models/Space');
const AppError = require('../utils/AppError');

const DAY = 24 * 60 * 60 * 1000;

/** Normaliza para o início do dia (UTC). Reservas são por diária: [start, end). */
const startOfDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const countDays = (start, end) => Math.round((end - start) / DAY);

function overlapFilter(spaceId, start, end, excludeId) {
  const filter = {
    space: spaceId,
    status: 'confirmed',
    startDate: { $lt: end },
    endDate: { $gt: start },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return filter;
}

async function findActiveSpace(spaceId) {
  const space = await Space.findById(spaceId);
  if (!space) throw AppError.notFound('Espaço não encontrado');
  if (!space.available) throw AppError.conflict('Espaço indisponível para reservas');
  return space;
}

/**
 * Garante que não haja reservas sobrepostas mesmo com requisições simultâneas:
 * depois de gravar, se existir outra reserva conflitante criada antes (ObjectId menor),
 * esta é desfeita. Assim apenas a primeira vence, sem precisar de transações.
 */
async function ensureNoRace(booking) {
  const conflict = await Booking.exists({
    ...overlapFilter(booking.space, booking.startDate, booking.endDate, booking._id),
    _id: { $lt: booking._id },
  });
  if (conflict) {
    await booking.deleteOne();
    throw AppError.conflict('Espaço já reservado para o período selecionado');
  }
}

async function create({ userId, spaceId, startDate, endDate, notes }) {
  const space = await findActiveSpace(spaceId);
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  if (await Booking.exists(overlapFilter(space._id, start, end))) {
    throw AppError.conflict('Espaço já reservado para o período selecionado');
  }

  const days = countDays(start, end);
  const booking = await Booking.create({
    user: userId,
    space: space._id,
    startDate: start,
    endDate: end,
    days,
    totalPrice: days * space.pricePerDay,
    notes,
  });

  await ensureNoRace(booking);
  return booking;
}

async function reschedule(booking, { startDate, endDate }) {
  if (booking.status === 'cancelled')
    throw AppError.conflict('Reserva cancelada não pode ser alterada');
  if (booking.startDate <= new Date())
    throw AppError.conflict('Reserva já iniciada não pode ser alterada');

  const space = await findActiveSpace(booking.space);
  const start = startOfDay(startDate ?? booking.startDate);
  const end = startOfDay(endDate ?? booking.endDate);
  if (start >= end) throw AppError.badRequest('A data final deve ser posterior à inicial');

  if (await Booking.exists(overlapFilter(space._id, start, end, booking._id))) {
    throw AppError.conflict('Espaço já reservado para o período selecionado');
  }

  const days = countDays(start, end);
  booking.set({ startDate: start, endDate: end, days, totalPrice: days * space.pricePerDay });
  return booking.save();
}

async function cancel(booking) {
  if (booking.status === 'cancelled') throw AppError.conflict('Reserva já cancelada');
  if (booking.startDate <= new Date())
    throw AppError.conflict('Reserva já iniciada não pode ser cancelada');
  booking.set({ status: 'cancelled', cancelledAt: new Date() });
  return booking.save();
}

/** Períodos ocupados de um espaço dentro de uma janela. */
async function occupied(spaceId, from, to) {
  return Booking.find(overlapFilter(spaceId, startOfDay(from), startOfDay(to)))
    .select('startDate endDate -_id')
    .sort({ startDate: 1 })
    .lean();
}

/** IDs de espaços com reserva ativa no período (para filtrar busca por disponibilidade). */
async function busySpaceIds(from, to) {
  return Booking.distinct('space', {
    status: 'confirmed',
    startDate: { $lt: startOfDay(to) },
    endDate: { $gt: startOfDay(from) },
  });
}

module.exports = { create, reschedule, cancel, occupied, busySpaceIds, startOfDay };
