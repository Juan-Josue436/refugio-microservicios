import express from 'express';
import proxy from 'express-http-proxy';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;

// URLs internas de Docker obtenidas de las variables de entorno
const SERVICIO_MASCOTAS = process.env.SERVICIO_MASCOTAS_URL || 'http://servicio-mascotas:3001';
const SERVICIO_SOLICITUDES = process.env.SERVICIO_SOLICITUDES_URL || 'http://servicio-solicitudes:3002';

const JWT_SECRET = 'secreto_super_seguro_para_la_clase';

app.use(express.json());

// Middleware de autenticación centralizada
const verificarToken = (rolesPermitidos?: string[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
       res.status(401).json({ error: 'Token no provisto o inválido' });
       return;
    }

    const token = authHeader.split(' ')[1];
    try {
      // CORRECCIÓN: Ahora sí verificamos la firma real con la clave secreta
      const decoded = jwt.verify(token, JWT_SECRET) as { id_usuario: string; rol: string };

      // Validar roles si la ruta lo requiere (ej. Solo Administrador)
      if (rolesPermitidos && !rolesPermitidos.includes(decoded.rol)) {
         res.status(403).json({ error: 'Acceso denegado: Permisos insuficientes' });
         return;
      }

      // Inyectar los datos en los headers para los microservicios internos
      req.headers['x-user-id'] = decoded.id_usuario;
      req.headers['x-user-role'] = decoded.rol;
      next();
    } catch (error) {
       res.status(401).json({ error: 'Token inválido o firma incorrecta' });
    }
  };
};

// --- RUTAS DE MASCOTAS (Mapeadas explícitamente para evitar el error 404) ---

// GET /mascotas -> Público (Cualquiera puede ver)
app.get('/mascotas', proxy(SERVICIO_MASCOTAS));

// POST /mascotas -> Solo Administrador
app.post('/mascotas', verificarToken(['Administrador']), proxy(SERVICIO_MASCOTAS));


// --- RUTAS DE SOLICITUDES (Mapeadas explícitamente) ---

// POST /solicitudes -> Usuario Autenticado
app.post('/solicitudes', verificarToken(), proxy(SERVICIO_SOLICITUDES));

// GET /solicitudes -> Solo Administrador
app.get('/solicitudes', verificarToken(['Administrador']), proxy(SERVICIO_SOLICITUDES));


app.listen(PORT, () => {
  console.log(` API Gateway corriendo en el puerto ${PORT}`);
});