const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "E-Waste",
    version: "1.0.0",
    description: "E-Waste API",
  },
  servers: [
    {
      url: "/api/v1",
      description: "Host system path",
    },
  ],
  definitions: {},
  paths: {},
  components: {
    securitySchemes: {
      JWT: {
        type: "apiKey",
        description:
          'JWT token is received after registering/login, input format: "Bearer \\<token\\>"',
        name: "Authorization",
        in: "header",
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: [],
};

export default options;
