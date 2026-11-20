/** Popula o banco com um admin, um nômade e alguns espaços de exemplo. */
const env = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Space = require('../src/models/Space');

const spaces = [
  {
    name: 'Cowork Tambaú',
    city: 'João Pessoa',
    address: 'Av. Almirante Tamandaré, 200',
    capacity: 20,
    pricePerDay: 45,
    amenities: ['wifi', 'cafe', 'ar_condicionado', 'sala_reuniao'],
  },
  {
    name: 'Hub Recife Antigo',
    city: 'Recife',
    address: 'Rua do Bom Jesus, 50',
    capacity: 40,
    pricePerDay: 60,
    amenities: ['wifi', 'cafe', 'impressora', 'armarios'],
  },
  {
    name: 'Casa Nômade Beira-Mar',
    city: 'Fortaleza',
    address: 'Av. Beira-Mar, 1500',
    capacity: 8,
    pricePerDay: 70,
    amenities: ['wifi', 'cozinha', 'pet_friendly'],
  },
  {
    name: 'Estação Campina',
    city: 'Campina Grande',
    address: 'Rua Maciel Pinheiro, 300',
    capacity: 15,
    pricePerDay: 35,
    amenities: ['wifi', 'cafe', 'estacionamento', 'acessibilidade'],
  },
];

(async () => {
  await connectDB(env.MONGO_URI);
  await Promise.all([User.deleteMany({}), Space.deleteMany({})]);
  await User.create([
    { name: 'Admin', email: 'admin@nomadnest.dev', password: 'Admin1234', role: 'admin' },
    { name: 'Nômade Demo', email: 'nomade@nomadnest.dev', password: 'Nomade1234' },
  ]);
  await Space.insertMany(spaces);
  console.log(
    '✅ Seed concluído: admin@nomadnest.dev / Admin1234 e nomade@nomadnest.dev / Nomade1234',
  );
  await disconnectDB();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
