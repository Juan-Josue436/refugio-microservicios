import express from 'express';
import mysql from 'mysql2/promise';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Configuración de la conexión a MySQL usando la variable de entorno
const dbConfig = {
  host: 'db-mascotas', // Nombre del contenedor en docker-compose
  user: 'usuario_mascotas',
  password: 'password_mascotas',
  database: 'mascotas_db',
  port: 3306
};

// Inicialización de la tabla para asegurar que exista al arrancar
async function initDB() {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database};`);
    await connection.end();

    const pool = await mysql.createPool(dbConfig);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mascotas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        especie VARCHAR(50) NOT NULL,
        edad VARCHAR(50) NOT NULL,
        estado VARCHAR(50) NOT NULL,
        fotoUrl VARCHAR(255)
      );
    `);
    console.log('✅ Base de datos MySQL de Mascotas inicializada correctamente.');
    return pool;
  } catch (error) {
    console.error('❌ Error inicializando MySQL, reintentando en 5s...', error);
    await new Promise(resolve => setTimeout(resolve, 5000));
    return initDB();
  }
}

let pool: mysql.Pool;
initDB().then(p => pool = p);

// GET /mascotas - Obtiene todas las disponibles
app.get('/mascotas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM mascotas WHERE estado = ?', ['Disponible']);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mascotas' });
  }
});

// GET /mascotas/:id - Endpoint interno síncrono usado por el servicio de solicitudes
app.get('/mascotas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows]: any = await pool.query('SELECT * FROM mascotas WHERE id = ?', [id]);
    
    if (rows.length === 0) {
       res.status(404).json({ error: 'Mascota no encontrada' });
       return;
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno en servicio de mascotas' });
  }
});

// POST /mascotas - Registra una nueva mascota
app.post('/mascotas', async (req, res) => {
  try {
    const { nombre, especie, edad, estado, fotoUrl } = req.body;
    const [result]: any = await pool.query(
      'INSERT INTO mascotas (nombre, especie, edad, estado, fotoUrl) VALUES (?, ?, ?, ?, ?)',
      [nombre, especie, edad, estado || 'Disponible', fotoUrl]
    );
    res.status(201).json({ id: result.insertId, nombre, especie, edad, estado, fotoUrl });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar la mascota' });
  }
});

app.listen(PORT, () => {
  console.log(`🐾 Servicio de Mascotas escuchando en el puerto ${PORT}`);
});