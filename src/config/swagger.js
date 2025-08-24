const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API NomadNest",
      version: "1.0.0",
      description: "Sistema de agendamento de espaços para nômades digitais",
    },
    servers: [
      { url: "http://localhost:3000/api" }
    ],
  },
  apis: ["./src/routes/*.js"], // onde estão suas rotas
};

const swaggerSpec = swaggerJsDoc(options);

const setupSwagger = (app) => {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;
