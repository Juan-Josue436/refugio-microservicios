import request from 'supertest';
import express from 'express';

// Instancia simulada de la aplicación Express para pruebas de lógica
const app = express();
app.use(express.json());

// Simulación de endpoint con validaciones
app.post('/mascotas', (req: any, res: any) => {
  const { nombre, especie, edad, estado } = req.body;

  if (!nombre || !especie || !edad) {
    return res.status(400).json({ error: 'Campos incompletos. Se requiere: nombre, especie y edad.' });
  }

  const estadoFinal = estado || 'Disponible';
  const estadosPermitidos = ['Disponible', 'Adoptado', 'En Proceso'];

  if (!estadosPermitidos.includes(estadoFinal)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  return res.status(201).json({ id: 1, nombre, especie, edad, estado: estadoFinal });
});

describe('Servicio de Mascotas - Validaciones de Entrada', () => {

  test('Debe rechazar la creación si faltan campos requeridos (400 Bad Request)', async () => {
    const response = await request(app)
      .post('/mascotas')
      .send({ especie: 'Perro' }); // Falta nombre y edad

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Campos incompletos');
  });

  test('Debe rechazar la creación si el estado no está permitido (400 Bad Request)', async () => {
    const response = await request(app)
      .post('/mascotas')
      .send({ nombre: 'Lucas', especie: 'Perro', edad: '3 años', estado: 'Invalido' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Estado inválido');
  });

  test('Debe registrar exitosamente si los datos son correctos (201 Created)', async () => {
    const response = await request(app)
      .post('/mascotas')
      .send({ nombre: 'Firulais', especie: 'Perro', edad: '2 años' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.nombre).toBe('Firulais');
    expect(response.body.estado).toBe('Disponible');
  });

});