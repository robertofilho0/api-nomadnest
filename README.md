# 🏝️ NomadNest API

[![CI](https://github.com/robertofilho0/api-nomadnest/actions/workflows/ci.yml/badge.svg)](https://github.com/robertofilho0/api-nomadnest/actions/workflows/ci.yml)
![NestJS](https://img.shields.io/badge/nestjs-12-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-6-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-17-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/prisma-7-2D3748?logo=prisma&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/rabbitmq-4-FF6600?logo=rabbitmq&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

API de reservas de espaços de coworking para nômades digitais em **NestJS + TypeScript**, com **PostgreSQL/Prisma**, busca por disponibilidade, **reservas sem conflito mesmo sob concorrência** e **notificações assíncronas via RabbitMQ**.

## ✨ Destaques

- **Sem reservas sobrepostas, nem com requisições simultâneas.** Criar ou remarcar uma reserva trava a linha do espaço (`SELECT … FOR UPDATE`) durante a transação, então a checagem de conflito nunca é burlada. Isso é testado com 5 requisições paralelas num PostgreSQL real.
- **Mensageria com RabbitMQ**: confirmar, remarcar ou cancelar uma reserva publica `booking.confirmed`, `booking.rescheduled` ou `booking.cancelled`. Um worker (`@EventPattern`, ack manual) gera a notificação do usuário e envia o e-mail, simulado no log. A requisição HTTP não espera o envio.
- **Funciona sem broker**: sem `RABBITMQ_URL`, um publisher em memória entrega os eventos ao worker. A troca é feita por injeção de dependência.
- **Busca por disponibilidade**: `GET /api/spaces?from=…&to=…` traz só os espaços livres no período, com filtros por cidade, comodidades, preço e capacidade.
- **Regras de negócio**: diárias e total calculados no servidor (valores em centavos no banco), sem reservas no passado, no máximo 90 dias, sem alterar ou cancelar reserva já iniciada e sem remover espaço com reservas futuras.
- **Permissões**: o visitante consulta espaços. O nômade gerencia só as próprias reservas e notificações (as de outras pessoas retornam `404`, sem revelar que existem). O admin gerencia espaços, usuários e todas as reservas. Rotas são privadas por padrão, com guard global de JWT e `@Public()`/`@Roles()`.
- Validação com **Zod** (nativa no Nest 12), Swagger gerado a partir dos schemas, Helmet, CORS, rate limit e health check.

## 🧱 Stack

NestJS 12 · TypeScript · PostgreSQL 17 · Prisma 7 · RabbitMQ 4 (`@nestjs/microservices`) · JWT · Zod · Swagger · Vitest · Supertest · Oxlint · Docker

## 🏗️ Fluxo de uma reserva

```
POST /api/bookings
   │
   ▼
BookingsService ── transação: FOR UPDATE no espaço → checa conflito → grava ──► PostgreSQL
   │
   ▼
EventPublisher.publish('booking.confirmed')  ──► fila nomadnest.notifications
                                                     │
                                                     ▼
                                       NotificationsConsumer (ack manual)
                                         ├─ grava a notificação do usuário
                                         └─ MailerService.send()
```

## 📁 Estrutura

```
src/
├── auth/            # cadastro, login, guard global de JWT e RolesGuard
├── users/           # perfil e administração
├── spaces/          # busca, disponibilidade e gestão (admin)
├── bookings/        # reservas com trava por espaço, remarcação e cancelamento
├── notifications/   # worker RabbitMQ, e-mail e API de notificações
├── messaging/       # EventPublisher (RabbitMQ ou memória) e conexão do consumer
├── prisma/ config/ common/ health/
prisma/schema.prisma + migrations/ + seed.ts
test/                # e2e contra PostgreSQL (e RabbitMQ no CI)
```

## 🚀 Como rodar

### Com Docker (API + PostgreSQL + RabbitMQ)

```bash
git clone https://github.com/robertofilho0/api-nomadnest.git
cd api-nomadnest
docker compose up --build
```

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/docs`
- RabbitMQ: `http://localhost:15672` (guest/guest)

### Localmente

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run db:seed        # admin@nomadnest.dev / Admin1234 e nomade@nomadnest.dev / Nomade1234
npm run start:dev
```

## 📚 Endpoints

| Método   | Rota                            | Acesso     | Descrição                             |
| -------- | ------------------------------- | ---------- | ------------------------------------- |
| `POST`   | `/api/auth/register`            | público    | Cadastro                              |
| `POST`   | `/api/auth/login`               | público    | Login                                 |
| `GET`    | `/api/users/me`                 | logado     | Meu perfil                            |
| `PATCH`  | `/api/users/me`                 | logado     | Atualiza meu perfil                   |
| `GET`    | `/api/users`                    | admin      | Lista usuários                        |
| `PATCH`  | `/api/users/:id/role`           | admin      | Altera o papel                        |
| `DELETE` | `/api/users/:id`                | admin      | Remove usuário                        |
| `GET`    | `/api/spaces`                   | público    | Busca com filtros e disponibilidade   |
| `GET`    | `/api/spaces/:id`               | público    | Detalhes                              |
| `GET`    | `/api/spaces/:id/availability`  | público    | Períodos ocupados                     |
| `POST`   | `/api/spaces`                   | admin      | Cadastra espaço                       |
| `PATCH`  | `/api/spaces/:id`               | admin      | Atualiza espaço                       |
| `DELETE` | `/api/spaces/:id`               | admin      | Remove (sem reservas futuras)         |
| `POST`   | `/api/bookings`                 | logado     | Cria reserva                          |
| `GET`    | `/api/bookings`                 | logado     | Minhas reservas (admin vê todas)      |
| `GET`    | `/api/bookings/:id`             | dono/admin | Detalhes                              |
| `PATCH`  | `/api/bookings/:id`             | dono/admin | Remarca                               |
| `POST`   | `/api/bookings/:id/cancel`      | dono/admin | Cancela                               |
| `DELETE` | `/api/bookings/:id`             | admin      | Exclui                                |
| `GET`    | `/api/notifications`            | logado     | Minhas notificações (`?unread=true`)  |
| `PATCH`  | `/api/notifications/:id/read`   | logado     | Marca como lida                       |
| `POST`   | `/api/notifications/read-all`   | logado     | Marca todas como lidas                |

```bash
# Espaços com wi-fi e café livres de 10 a 15 de dezembro em João Pessoa
curl "http://localhost:3000/api/spaces?city=João%20Pessoa&amenities=wifi,cafe&from=2026-12-10&to=2026-12-15"
```

## 🧪 Testes

```bash
npm test             # unitários
npm run test:e2e     # e2e: requer DATABASE_URL; com RABBITMQ_URL também passa pelo broker
npm run lint
```

O CI sobe **PostgreSQL** e **RabbitMQ**, aplica as migrations, confere se elas batem com o `schema.prisma` e roda lint, testes e build.

## 📄 Licença

MIT. Veja [LICENSE](LICENSE).

---

Feito por [Roberto Filho](https://github.com/robertofilho0) · [LinkedIn](https://www.linkedin.com/in/roberto-filho-393b372b2/)
