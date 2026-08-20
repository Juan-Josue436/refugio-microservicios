import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import usuarios from './usuarios.json';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// URLs de los microservicios (usan los nombres de servicio de Docker Compose)
const SERVICIO_MASCOTAS_URL = process.env.SERVICIO_MASCOTAS_URL || 'http://servicio-mascotas:3001';
const SERVICIO_SOLICITUDES_URL = process.env.SERVICIO_SOLICITUDES_URL || 'http://servicio-solicitudes:3002';

app.use(cors());
app.use(express.json());

// Documentación con Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /:
 *   get:
 *     summary: Verificación del estado del API Gateway
 *     description: Retorna un mensaje indicando que el Gateway está en ejecución.
 *     responses:
 *       200:
 *         description: Servicio operando correctamente.
 */
app.get('/', (req: Request, res: Response) => {
  res.json({ mensaje: 'API Gateway operando correctamente' });
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión y obtener JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuario:
 *                 type: string
 *                 example: cliente
 *               contrasena:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Autenticación exitosa, retorna el token JWT y datos de rol.
 *       401:
 *         description: Credenciales inválidas.
 */
app.post('/auth/login', (req: Request, res: Response) => {
  const { usuario, contrasena } = req.body;
  
  // Buscar usuario en el archivo usuarios.json
  const usuarioEncontrado = usuarios.find(
    (u) => u.usuario === usuario && u.contrasena === contrasena
  );

  if (usuarioEncontrado) {
    return res.json({ 
      token: `jwt-simulado-token-${usuarioEncontrado.rol}-${usuarioEncontrado.id}`,
      id: usuarioEncontrado.id, // 👈 Se agrega para que el frontend obtenga el ID
      usuario: usuarioEncontrado.usuario,
      rol: usuarioEncontrado.rol
    });
  }

  return res.status(401).json({ error: 'Credenciales inválidas' });
});

/**
 * @openapi
 * /mascotas:
 *   get:
 *     summary: Listar todas las mascotas
 *     responses:
 *       200:
 *         description: Lista de mascotas registradas.
 *   post:
 *     summary: Registrar una nueva mascota
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Firulais
 *               especie:
 *                 type: string
 *                 example: Perro
 *               edad:
 *                 type: string
 *                 example: 2 años
 *     responses:
 *       201:
 *         description: Mascota registrada exitosamente.
 *       400:
 *         description: Datos incompletos o erróneos.
 *       401:
 *         description: Token no provisto o no válido.
 */
app.get('/mascotas', async (req: Request, res: Response) => {
  try {
    const respuesta = await axios.get(`${SERVICIO_MASCOTAS_URL}/mascotas`);
    return res.json(respuesta.data);
  } catch (error: any) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Error al conectar con Servicio Mascotas' });
  }
});

app.post('/mascotas', async (req: Request, res: Response) => {
  try {
    const respuesta = await axios.post(`${SERVICIO_MASCOTAS_URL}/mascotas`, req.body, {
      headers: { authorization: req.headers.authorization || '' }
    });
    return res.status(201).json(respuesta.data);
  } catch (error: any) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Error al registrar mascota' });
  }
});

/**
 * @openapi
 * /mascotas/{id}:
 *   delete:
 *     summary: Eliminar una mascota por ID (Solo Administrador)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mascota eliminada correctamente.
 *       401:
 *         description: No autorizado.
 */
app.delete('/mascotas/:id', async (req: Request, res: Response) => {
  try {
    const respuesta = await axios.delete(`${SERVICIO_MASCOTAS_URL}/mascotas/${req.params.id}`, {
      headers: { authorization: req.headers.authorization || '' }
    });
    return res.json(respuesta.data);
  } catch (error: any) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Error al eliminar mascota' });
  }
});

/**
 * @openapi
 * /solicitudes:
 *   post:
 *     summary: Crear una nueva solicitud de adopción
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_mascota:
 *                 type: string
 *                 example: "1"
 *               mensaje:
 *                 type: string
 *                 example: Tengo espacio en casa y cuento con disponibilidad para cuidarla.
 *     responses:
 *       201:
 *         description: Solicitud de adopción enviada con éxito.
 *       400:
 *         description: El mensaje debe contener al menos 10 caracteres.
 *       401:
 *         description: Acceso no autorizado.
 */
app.post('/solicitudes', async (req: Request, res: Response) => {
  try {
    // 1. Guardar la solicitud de adopción
    const respuesta = await axios.post(`${SERVICIO_SOLICITUDES_URL}/solicitudes`, req.body, {
      headers: { 
        authorization: req.headers.authorization || '',
        'x-user-id': req.headers['x-user-id'] || ''
      }
    });

    // 2. Cambiar el estado de la mascota a "En Proceso"
    if (req.body.id_mascota) {
      await axios.put(`${SERVICIO_MASCOTAS_URL}/mascotas/${req.body.id_mascota}`, {
        estado: 'En Proceso'
      }).catch(err => {
        console.warn('[API Gateway] No se pudo actualizar el estado de la mascota:', err.message);
      });
    }

    return res.status(201).json(respuesta.data);
  } catch (error: any) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Error al procesar solicitud' });
  }
});

app.listen(PORT, () => {
  console.log(`[API Gateway] Escuchando en el puerto ${PORT}`);
  console.log(`[Documentación] Swagger UI disponible en http://localhost:${PORT}/api-docs`);
});