import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gateway - Sistema de Adopción de Mascotas',
      version: '1.0.0',
      description: 'Documentación centralizada del API Gateway y sus microservicios asociados.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local (API Gateway)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Introduce el token JWT obtenido del endpoint /auth/login para autenticarte.',
        },
      },
    },
  },
  apis: ['./src/index.ts', './src/routes/*.ts'], // Archivos donde buscaremos la documentación JSDoc
};

export const swaggerSpec = swaggerJSDoc(options);