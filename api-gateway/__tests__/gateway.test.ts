import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';

// Clave secreta fija para las pruebas unitarias
const JWT_SECRET = 'secreto_super_seguro_para_la_clase';

// Instancia reducida de la lógica del Gateway para probar middlewares sin levantar servidores externos
const app = express();
app.use(express.json());

// Middleware de autenticación a probar
const authMiddleware = (rolesPermitidos: string[]) => {
  return (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(decoded.rol)) {
        return res.status(403).json({ error: 'Acceso denegado: permisos insuficientes' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };
};

// Rutas de prueba
app.get('/publica', (req, res) => res.json({ mensaje: 'OK' }));
app.get('/protegida', authMiddleware(['Administrador']), (req, res) => res.json({ mensaje: 'Acceso concedido' }));

// Suite de pruebas con Jest
describe('API Gateway - Pruebas de Seguridad y Middleware', () => {

  test('Debe permitir acceso a rutas públicas sin token (200 OK)', async () => {
    const response = await request(app).get('/publica');
    expect(response.status).toBe(200);
    expect(response.body.mensaje).toBe('OK');
  });

  test('Debe rechazar peticiones protegidas sin token de autorización (401 Unauthorized)', async () => {
    const response = await request(app).get('/protegida');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Token no proporcionado');
  });

  test('Debe rechazar peticiones si el usuario no tiene el rol de Administrador (403 Forbidden)', async () => {
    const tokenUsuario = jwt.sign({ id: 'user123', rol: 'Usuario' }, JWT_SECRET);

    const response = await request(app)
      .get('/protegida')
      .set('Authorization', `Bearer ${tokenUsuario}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Acceso denegado: permisos insuficientes');
  });

  test('Debe permitir acceso si el token incluye el rol de Administrador (200 OK)', async () => {
    const tokenAdmin = jwt.sign({ id: 'admin123', rol: 'Administrador' }, JWT_SECRET);

    const response = await request(app)
      .get('/protegida')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(response.status).toBe(200);
    expect(response.body.mensaje).toBe('Acceso concedido');
  });

});