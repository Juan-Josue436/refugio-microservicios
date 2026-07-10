import express from 'express';
import { Pool } from 'pg';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3002;

const SERVICIO_MASCOTAS_URL = process.env.SERVICIO_MASCOTAS_URL || 'http://servicio-mascotas:3001';

app.use(express.json());

// Configuración de PostgreSQL usando la URL de conexión de Docker Compose
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://usuario_adopcion:password_seguro@db-solicitudes:5432/solicitudes_db'
});

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
    console.log('✅ Base de datos PostgreSQL de Solicitudes inicializada.');
  } catch (error) {
    console.error('❌ Error conectando a Postgres, reintentando en 5s...', error);
    await new Promise(resolve => setTimeout(resolve, 5000));
    return initDB();
  }
}
initDB();

// POST /solicitudes - Crea una solicitud de adopción
app.post('/solicitudes', async (req, res): Promise<void> => {
  try {
    const id_usuario = req.headers['x-user-id'] as string; // Extraído previamente por el Gateway
    const { id_mascota, mensaje } = req.body;

    if (!id_usuario) {
       res.status(401).json({ error: 'Usuario no identificado' });
       return;
    }

    // --- COMUNICACIÓN SÍNCRONA INTER-SERVICIO (Paso crucial de tu reporte) ---
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
       res.status(503).json({ error: 'No se pudo validar la mascota debido a un error interno del sistema' });
       return;
    }

    // Si todo es válido, guardamos en la persistencia aislada de este servicio
    const query = 'INSERT INTO solicitudes (id_usuario, id_mascota, mensaje, estado) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [id_usuario, id_mascota, mensaje, 'Pendiente'];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// GET /solicitudes - Ver todas las solicitudes (Solo Administrador, filtrado en Gateway)
app.get('/solicitudes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM solicitudes');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las solicitudes' });
  }
});

app.listen(PORT, () => {
  console.log(`📋 Servicio de Solicitudes escuchando en el puerto ${PORT}`);
});