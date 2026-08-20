import express from 'express';
import mysql from 'mysql2/promise';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Cadena de conexión MySQL
const connectionString = process.env.DATABASE_URL || 'mysql://usuario_mascotas:password_mascotas@db-mascotas:3306/mascotas_db';

const pool = mysql.createPool(connectionString);

async function initDB() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Base de datos MySQL de Mascotas conectada.');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mascotas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        especie VARCHAR(50) NOT NULL,
        edad VARCHAR(50) NOT NULL,
        estado VARCHAR(20) DEFAULT 'Disponible'
      )
    `);
    connection.release();
    console.log('✅ Tabla "mascotas" verificada/creada en MySQL.');
  } catch (error) {
    console.error('❌ Error conectando a MySQL, reintentando en 5s...', error);
    setTimeout(initDB, 5000);
  }
}
initDB();

// GET /mascotas - Obtener todas las mascotas
app.get('/mascotas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM mascotas');
    res.json(rows);
  } catch (error) {
    console.error('Error en GET /mascotas:', error);
    res.status(500).json({ error: 'Error al obtener las mascotas' });
  }
});

// GET /mascotas/:id - Obtener una mascota por ID
app.get('/mascotas/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const [rows]: any = await pool.query('SELECT * FROM mascotas WHERE id = ?', [id]);

    if (rows.length === 0) {
      res.status(404).json({ error: 'Mascota no encontrada' });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error en GET /mascotas/:id:', error);
    res.status(500).json({ error: 'Error al obtener la mascota' });
  }
});

// POST /mascotas - Registrar nueva mascota
app.post('/mascotas', async (req, res): Promise<void> => {
  try {
    const { nombre, especie, edad } = req.body;

    if (!nombre || !especie || !edad) {
      res.status(400).json({ error: 'Todos los campos (nombre, especie, edad) son obligatorios' });
      return;
    }

    const [result]: any = await pool.query(
      'INSERT INTO mascotas (nombre, especie, edad, estado) VALUES (?, ?, ?, ?)',
      [nombre, especie, edad, 'Disponible']
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      especie,
      edad,
      estado: 'Disponible'
    });
  } catch (error) {
    console.error('Error en POST /mascotas:', error);
    res.status(500).json({ error: 'Error al crear la mascota' });
  }
});

// PUT /mascotas/:id - Actualizar estado de una mascota
app.put('/mascotas/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      res.status(400).json({ error: 'El campo estado es requerido' });
      return;
    }

    const [result]: any = await pool.query(
      'UPDATE mascotas SET estado = ? WHERE id = ?',
      [estado, id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Mascota no encontrada' });
      return;
    }

    res.json({ mensaje: 'Estado de mascota actualizado correctamente', id, estado });
  } catch (error) {
    console.error('Error en PUT /mascotas/:id:', error);
    res.status(500).json({ error: 'Error al actualizar la mascota' });
  }
});

// DELETE /mascotas/:id - Eliminar una mascota por ID (NUEVO)
app.delete('/mascotas/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const [result]: any = await pool.query('DELETE FROM mascotas WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Mascota no encontrada' });
      return;
    }

    res.json({ mensaje: 'Mascota eliminada correctamente', id });
  } catch (error) {
    console.error('Error en DELETE /mascotas/:id:', error);
    res.status(500).json({ error: 'Error al eliminar la mascota de la base de datos' });
  }
});

app.listen(PORT, () => {
  console.log(`🐶 Servicio de Mascotas escuchando en el puerto ${PORT}`);
});