import request from 'supertest';
import express from 'express';

const app = express();
app.use(express.json());

app.post('/solicitudes', (req: any, res: any) => {
  const id_usuario = req.headers['x-user-id'];
  const { id_mascota, mensaje } = req.body;

  if (!id_usuario) {
    return res.status(401).json({ error: 'Acceso no autorizado' });
  }

  if (!id_mascota || !mensaje) {
    return res.status(400).json({ error: 'Petición incorrecta: Se requiere id_mascota y mensaje' });
  }

  if (typeof mensaje !== 'string' || mensaje.trim().length < 10) {
    return res.status(400).json({ error: 'El mensaje debe tener al menos 10 caracteres' });
  }

  return res.status(201).json({ id: 101, id_usuario, id_mascota, mensaje, estado: 'Pendiente' });
});

describe('Servicio de Solicitudes - Validaciones de Entrada', () => {

  test('Debe rechazar si la solicitud no incluye la cabecera x-user-id (401 Unauthorized)', async () => {
    const response = await request(app)
      .post('/solicitudes')
      .send({ id_mascota: '1', mensaje: 'Quiero adoptar a esta mascota.' });

    expect(response.status).toBe(401);
  });

  test('Debe rechazar si el mensaje tiene menos de 10 caracteres (400 Bad Request)', async () => {
    const response = await request(app)
      .post('/solicitudes')
      .set('x-user-id', 'user123')
      .send({ id_mascota: '1', mensaje: 'Hola' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('al menos 10 caracteres');
  });

  test('Debe procesar la solicitud correctamente si las validaciones pasan (201 Created)', async () => {
    const response = await request(app)
      .post('/solicitudes')
      .set('x-user-id', 'user123')
      .send({ id_mascota: '1', mensaje: 'Tengo espacio suficiente para adoptar a la mascota.' });

    expect(response.status).toBe(201);
    expect(response.body.estado).toBe('Pendiente');
  });

});