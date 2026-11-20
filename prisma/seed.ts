// Dados de demonstração: admin@nomadnest.dev / Admin1234 e nomade@nomadnest.dev / Nomade1234
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const users = [
  { name: 'Admin', email: 'admin@nomadnest.dev', password: 'Admin1234', role: 'ADMIN' as const },
  { name: 'Nômade Demo', email: 'nomade@nomadnest.dev', password: 'Nomade1234', role: 'NOMAD' as const },
];
for (const { password, ...u } of users) {
  await prisma.user.upsert({
    where: { email: u.email },
    update: {},
    create: { ...u, passwordHash: await bcrypt.hash(password, 12) },
  });
}

if ((await prisma.space.count()) === 0) {
  await prisma.space.createMany({
    data: [
      { name: 'Cowork Tambaú', city: 'João Pessoa', address: 'Av. Almirante Tamandaré, 200', capacity: 20, pricePerDayCents: 4500, amenities: ['wifi', 'cafe', 'ar_condicionado', 'sala_reuniao'] },
      { name: 'Hub Recife Antigo', city: 'Recife', address: 'Rua do Bom Jesus, 50', capacity: 40, pricePerDayCents: 6000, amenities: ['wifi', 'cafe', 'impressora', 'armarios'] },
      { name: 'Casa Nômade Beira-Mar', city: 'Fortaleza', address: 'Av. Beira-Mar, 1500', capacity: 8, pricePerDayCents: 7000, amenities: ['wifi', 'cozinha', 'pet_friendly'] },
      { name: 'Estação Campina', city: 'Campina Grande', address: 'Rua Maciel Pinheiro, 300', capacity: 15, pricePerDayCents: 3500, amenities: ['wifi', 'cafe', 'estacionamento', 'acessibilidade'] },
    ],
  });
}

console.log('✅ Seed concluído');
await prisma.$disconnect();
