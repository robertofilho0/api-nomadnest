# 📅 API NomadNest - Node.js + Express + MongoDB
API para gerenciamento de agendamentos de espaços para nômades digitais, com operações CRUD para usuários, espaços e reservas, controle de acesso via JWT e validação de datas.  
Desenvolvida com **Node.js 22.x**, **Express 4.x** e **MongoDB 7.x**.  
O foco deste projeto é exclusivamente back-end, com toda a API já funcional e estruturada.

## 📌 Ajustes e melhorias
O projeto ainda está em desenvolvimento e as próximas atualizações serão voltadas para as seguintes tarefas:

- [x] CRUD completo de usuários  
- [x] CRUD completo de espaços  
- [x] CRUD completo de reservas  
- [x] Controle de acesso com JWT (autenticação e rotas protegidas)  
- [x] Validação de datas sobrepostas para reservas  
- [ ] Documentação Swagger/OpenAPI detalhada  
- [ ] Testes automatizados  
- [ ] Integração com notificações (e-mail/SMS)  
- [ ] Melhorias em filtros e listagens personalizadas  

## ✅ O que já foi feito
**Usuários**  
- Cadastro, listagem, atualização e exclusão  
- Proteção de rotas via JWT  

**Espaços**  
- Cadastro, listagem, atualização e exclusão  
- Campos: `name`, `location`, `pricePerDay`, `amenities`, `available`  

**Reservas**  
- Criar, listar, buscar, atualizar e deletar reservas  
- Validação de datas para evitar conflitos de agendamento  

**Autenticação**  
- Registro e login de usuários  
- JWT para autenticação de rotas protegidas  

**Testes**  
- Testes manuais de todos os endpoints no Postman  
- Testes de reservas com validação de datas sobrepostas  

## 💻 Pré-requisitos
Antes de começar, verifique se você possui:

- **Node.js** 22.x  
- **npm** 9.x  
- Banco de dados **MongoDB** configurado  
- Compatível com **Windows**, **Linux** e **macOS**  

## 🚀 Instalando API NomadNest
**1. Clone o repositório:**
```bash
git clone https://github.com/RobertoTheDev/api-nomadnest.git
cd api-nomadnest
```

**2. Instale as dependências via npm:**
```bash
npm install
```

**3. Configure o arquivo .env:**
```env
MONGO_URI=mongodb://localhost:27017/nomadnest
PORT=3000
JWT_SECRET=sua_chave_secreta
JWT_EXPIRES=7d
```
**4. Inicie o servidor local:**
```bash
npm run dev
```
A API estará disponível em: http://localhost:3000

## 📂 Estrutura do Projeto
````pgsql
api-nomadnest/
├── src/
│ ├── controllers/ # Lógica dos endpoints
│ │ ├── authController.js
│ │ ├── userController.js
│ │ ├── spaceController.js
│ │ └── bookingController.js
│ │
│ ├── models/ # Schemas do MongoDB (Mongoose)
│ │ ├── User.js
│ │ ├── Space.js
│ │ └── Booking.js
│ │
│ ├── routes/ # Rotas da API
│ │ ├── auth.js
│ │ ├── users.js
│ │ ├── spaces.js
│ │ └── bookings.js
│ │
│ ├── middlewares/ # Middlewares (ex.: autenticação JWT)
│ │ ├── requireAuth.js
│ │ └── validateDates.js
│ │
│ ├── utils/ # Funções utilitárias
│ │ └── helpers.js
│ │
│ ├── config/ # Configurações (ex.: DB, JWT)
│ │ └── db.js
│ │
│ └── app.js # Inicialização do Express
│
├── tests/ # Testes manuais ou automatizados
│ └── bookings.test.js
│
├── .env # Variáveis de ambiente
├── package.json
├── package-lock.json
├── README.md
└── nodemon.json # Configuração do nodemon (opcional)
````
## 📡 Endpoints da API:
**🔑 Autenticação (/api/auth)**

| Método | Endpoint           | Auth | Descrição                |
| ------ | ------------------ | ---- | ------------------------ |
| POST   | /api/auth/register | ❌    | Registrar novo usuário   |
| POST   | /api/auth/login    | ❌    | Login e retorno do token |

**👤 Usuários (/api/users)**
| Método | Endpoint        | Auth | Descrição                 |
| ------ | --------------- | ---- | ------------------------- |
| GET    | /api/users      | 🔒   | Listar todos os usuários  |
| POST   | /api/users      | 🔒   | Criar novo usuário        |
| GET    | /api/users/\:id | 🔒   | Exibir usuário específico |
| PUT    | /api/users/\:id | 🔒   | Atualizar usuário         |
| DELETE | /api/users/\:id | 🔒   | Remover usuário           |

**🏢 Espaços (/api/spaces)**
| Método | Endpoint         | Auth | Descrição                |
| ------ | ---------------- | ---- | ------------------------ |
| GET    | /api/spaces      | 🔒   | Listar todos os espaços  |
| POST   | /api/spaces      | 🔒   | Criar novo espaço        |
| GET    | /api/spaces/\:id | 🔒   | Exibir espaço específico |
| PUT    | /api/spaces/\:id | 🔒   | Atualizar espaço         |
| DELETE | /api/spaces/\:id | 🔒   | Remover espaço           |

**📅 Reservas (/api/bookings)**
| Método | Endpoint           | Auth | Descrição                          |
| ------ | ------------------ | ---- | ---------------------------------- |
| GET    | /api/bookings      | 🔒   | Listar todas as reservas           |
| POST   | /api/bookings      | 🔒   | Criar reserva (validação de datas) |
| GET    | /api/bookings/\:id | 🔒   | Buscar reserva por ID              |
| PUT    | /api/bookings/\:id | 🔒   | Atualizar reserva                  |
| DELETE | /api/bookings/\:id | 🔒   | Deletar reserva                    |

## 🛠 Tecnologias utilizadas

- **Node.js** 22.x

- **Express** 4.x

- **MongoDB** 7.x

- **Mongoose** para modelagem de dados

- **JWT** para autenticação

- **Swagger** para documentação (em desenvolvimento)

- **Nodemon** para desenvolvimento
