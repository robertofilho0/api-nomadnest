# 🏝️ NomadNest API

[![CI](https://github.com/robertofilho0/api-nomadnest/actions/workflows/ci.yml/badge.svg)](https://github.com/robertofilho0/api-nomadnest/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-5-000000?logo=express)
![MongoDB](https://img.shields.io/badge/mongodb-7-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

API de reservas de espaços de coworking para nômades digitais: busca de espaços por cidade, comodidades e **disponibilidade no período**, reservas com **prevenção de conflitos**, cálculo de valor, remarcação e cancelamento.

## ✨ Destaques

- **Sem reservas sobrepostas, nem com requisições simultâneas.** Após gravar, a reserva confere se outra conflitante foi criada antes (pela ordem do ObjectId) e se desfaz se for o caso. Assim apenas a primeira vence, sem depender de transações. Isso é coberto por teste com 5 requisições paralelas.
- **Busca por disponibilidade**: `GET /api/spaces?from=...&to=...` retorna só os espaços livres no período.
- **Diárias e valor total calculados no servidor**, recalculados na remarcação.
- **Regras de negócio**: sem reservas no passado, no máximo 90 dias, sem alterar ou cancelar reserva já iniciada, sem remover espaço com reservas futuras e sem reservar espaço desativado.
- **Permissões**: o visitante consulta espaços, o nômade gerencia **apenas as próprias reservas** (as de outras pessoas retornam `404`, sem revelar que existem) e o admin gerencia espaços, usuários e todas as reservas.
- Validação com **Zod**, senhas com bcrypt, JWT obrigatório, **Helmet**, **CORS**, **rate limiting** e health check.
- **Swagger UI** em `/api/docs`, **testes de integração** com MongoDB em memória, **Docker** e **CI**.

## 🧱 Stack

Node.js 22+ · Express 5 · MongoDB / Mongoose · JWT · Zod · Jest · Supertest · Docker

## 📁 Estrutura

```
src/
├── app.js / server.js
├── config/                    # env validado e conexão com o banco
├── models/                    # User, Space, Booking
├── services/booking.service.js  # conflitos, concorrência, preço, remarcação e cancelamento
├── controllers/               # auth, users, spaces, bookings
├── routes/index.js            # todas as rotas com permissões
├── validators/schemas.js      # schemas Zod (períodos, filtros e entradas)
├── middlewares/               # auth, validação, 404 e erros
└── docs/openapi.json
scripts/seed.js                # dados de demonstração
tests/
```

## 🚀 Como rodar

### Com Docker

```bash
git clone https://github.com/robertofilho0/api-nomadnest.git
cd api-nomadnest
docker compose up --build
docker compose exec api npm run seed   # opcional: dados de exemplo
```

### Localmente

```bash
npm install
cp .env.example .env   # defina MONGO_URI e JWT_SECRET
npm run seed           # opcional
npm run dev
```

A API sobe em `http://localhost:3000/api` e a documentação em `http://localhost:3000/api/docs`.

**Usuários do seed:** `admin@nomadnest.dev` / `Admin1234` e `nomade@nomadnest.dev` / `Nomade1234`.

## 📚 Endpoints

| Método   | Rota                           | Acesso     | Descrição                           |
| -------- | ------------------------------ | ---------- | ----------------------------------- |
| `POST`   | `/api/auth/register`           | público    | Cadastro                            |
| `POST`   | `/api/auth/login`              | público    | Login                               |
| `GET`    | `/api/users/me`                | logado     | Meu perfil                          |
| `PATCH`  | `/api/users/me`                | logado     | Atualiza meu perfil                 |
| `GET`    | `/api/users`                   | admin      | Lista usuários                      |
| `PATCH`  | `/api/users/:id/role`          | admin      | Altera o papel                      |
| `DELETE` | `/api/users/:id`               | admin      | Remove usuário e reservas           |
| `GET`    | `/api/spaces`                  | público    | Busca com filtros e disponibilidade |
| `GET`    | `/api/spaces/:id`              | público    | Detalhes                            |
| `GET`    | `/api/spaces/:id/availability` | público    | Períodos ocupados em uma janela     |
| `POST`   | `/api/spaces`                  | admin      | Cadastra espaço                     |
| `PATCH`  | `/api/spaces/:id`              | admin      | Atualiza espaço                     |
| `DELETE` | `/api/spaces/:id`              | admin      | Remove (sem reservas futuras)       |
| `POST`   | `/api/bookings`                | logado     | Cria reserva                        |
| `GET`    | `/api/bookings`                | logado     | Minhas reservas (admin vê todas)    |
| `GET`    | `/api/bookings/:id`            | dono/admin | Detalhes                            |
| `PATCH`  | `/api/bookings/:id`            | dono/admin | Remarca                             |
| `POST`   | `/api/bookings/:id/cancel`     | dono/admin | Cancela                             |
| `DELETE` | `/api/bookings/:id`            | admin      | Exclui                              |

**Filtros de `/api/spaces`:** `city`, `search`, `amenities` (ex.: `wifi,cafe`), `minCapacity`, `maxPrice`, `from` + `to`, `sortBy`, `order`, `page` e `limit`.

**Comodidades:** `wifi`, `cafe`, `ar_condicionado`, `estacionamento`, `sala_reuniao`, `impressora`, `cozinha`, `armarios`, `acessibilidade` e `pet_friendly`.

### Exemplo

```bash
# Espaços com wi-fi e café livres de 10 a 15 de dezembro em João Pessoa
curl "http://localhost:3000/api/spaces?city=João%20Pessoa&amenities=wifi,cafe&from=2026-12-10&to=2026-12-15"

# Reservar (check-in 10/12, check-out 15/12 = 5 diárias)
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"spaceId":"<ID>","startDate":"2026-12-10","endDate":"2026-12-15"}'
```

```json
{
  "id": "6760...",
  "space": { "name": "Cowork Tambaú", "city": "João Pessoa", "pricePerDay": 45 },
  "startDate": "2026-12-10T00:00:00.000Z",
  "endDate": "2026-12-15T00:00:00.000Z",
  "days": 5,
  "totalPrice": 225,
  "status": "confirmed"
}
```

Se o período já estiver ocupado, a resposta é `409`: `{ "error": "Espaço já reservado para o período selecionado" }`.

## 🧪 Testes

```bash
npm test               # MongoDB em memória
npm run test:coverage
npm run lint
```

## 📄 Licença

MIT. Veja [LICENSE](LICENSE).

---

Feito por [Roberto Filho](https://github.com/robertofilho0) · [LinkedIn](https://www.linkedin.com/in/roberto-filho-393b372b2/)
