import express from 'express';
import { Pool } from 'pg';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3002;

const SERVICIO_MASCOTAS_URL = process.env.SERVICIO_MASCOTAS_URL || 'http://servicio-mascotas:3001';

app.use(express.json());

// Configuración de conexión a PostgreSQL usando variables de entorno con fallbacks
const dbUser = process.env.DB_USER || process.env.POSTGRES_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgrespassword';
const dbHost = process.env.DB_HOST || process.env.POSTGRES_HOST || 'db-solicitudes';
const dbName = process.env.DB_NAME || process.env.POSTGRES_DB || 'solicitudes_db';

const connectionString = process.env.DATABASE_URL || `postgresql://${dbUser}:${dbPassword}@${dbHost}:5432/${dbName}`;

const pool = new Pool({ connectionString });

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS solicitudes (
        id SERIAL PRIMARY KEY,
        id_usuario VARCHAR(255) NOT NULL,
        id_mascota VARCHAR(255) NOT NULL,
        mensaje TEXT NOT NULL,
        estado VARCHAR(50) NOT NULL
      );
    `);
    console.log('✅ Base de datos PostgreSQL de Solicitudes inicializada correctamente.');
  } catch (error) {
    console.error('❌ Error conectando a Postgres, reintentando en 5s...', error);
    await new Promise(resolve => setTimeout(resolve, 5000));
    return initDB();
  }
}
initDB();

// POST /solicitudes - Crea una solicitud de adopción (CON VALIDACIONES DE ENTRADA)
app.post('/solicitudes', async (req, res): Promise<void> => {
  try {
    const id_usuario = req.headers['x-user-id'] as string; // Extraído previamente por el Gateway
    const { id_mascota, mensaje } = req.body;

    // 1. VALIDACIÓN: Verificar identificación del usuario (inyectado por el API Gateway)
    if (!id_usuario) {
      res.status(401).json({ error: 'Acceso no autorizado: Usuario no identificado' });
      return;
    }

    // 2. VALIDACIÓN: Presencia de campos obligatorios
    if (!id_mascota || !mensaje) {
      res.status(400).json({ 
        error: 'Petición incorrecta: Se requiere id_mascota y un mensaje para la solicitud.' 
      });
      return;
    }

    // 3. VALIDACIÓN: Longitud y formato del mensaje
    if (typeof mensaje !== 'string' || mensaje.trim().length < 10) {
      res.status(400).json({ 
        error: 'El mensaje de la solicitud debe ser un texto explicativo de al menos 10 caracteres.' 
      });
      return;
    }

    // --- COMUNICACIÓN SÍNCRONA INTER-SERVICIO ---
    try {
      const respuestaMascota = await axios.get(`${SERVICIO_MASCOTAS_URL}/mascotas/${id_mascota}`);
      const mascota = respuestaMascota.data;

      if (mascota.estado !== 'Disponible') {
        res.status(400).json({ error: 'La mascota no se encuentra disponible para adopción' });
        return;
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        res.status(404).json({ error: 'La mascota solicitada no existe' });
        return;
      }
      res.status(503).json({ error: 'No se pudo validar la mascota debido a un error de comunicación interna' });
      return;
    }

    // Si todas las validaciones pasan, se guarda en PostgreSQL
    const query = 'INSERT INTO solicitudes (id_usuario, id_mascota, mensaje, estado) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [id_usuario, id_mascota, mensaje.trim(), 'Pendiente'];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error en POST /solicitudes:', error);
    res.status(500).json({ error: 'Error interno al procesar la solicitud' });
  }
});

// GET /solicitudes - Ver todas las solicitudes (Solo Administrador, filtrado en Gateway)
app.get('/solicitudes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM solicitudes');
    res.json(result.rows);
  } catch (error) {
    console.error('Error en GET /solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener las solicitudes' });
  }
});

app.listen(PORT, () => {
  console.log(`📋 Servicio de Solicitudes escuchando en el puerto ${PORT}`);
});
