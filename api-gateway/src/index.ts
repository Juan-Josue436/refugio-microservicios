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

// Middleware de autenticación centralizada (Simulación)
const verificarToken = (rolesPermitidos?: string[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
       res.status(401).json({ error: 'Token no provisto o inválido' });
       return;
    }

    const token = authHeader.split(' ')[1];
    try {
      // En un escenario real verificarías con jwt.verify(token, JWT_SECRET)
      // Para la simulación de la clase, decodificamos un token ficticio
      const decoded = jwt.decode(token) as { id_usuario: string; rol: string } | null;
      
      if (!decoded) {
         res.status(401).json({ error: 'Token corrupto' });
         return;
      }

      // Validar roles si la ruta lo requiere (ej. Solo Administrador)
      if (rolesPermitidos && !rolesPermitidos.includes(decoded.rol)) {
         res.status(403).json({ error: 'Acceso denegado: Permisos insuficientes' });
         return;
      }

      // Inyectar los datos en los headers para que los microservicios internos los lean
      req.headers['x-user-id'] = decoded.id_usuario;
      req.headers['x-user-role'] = decoded.rol;
      next();
    } catch (error) {
       res.status(401).json({ error: 'Token inválido' });
    }
  };
};

// --- RUTAS DE MASCOTAS ---
// GET /mascotas -> Público
app.use('/mascotas', (req, res, next) => {
  if (req.method === 'GET') {
    return proxy(SERVICIO_MASCOTAS)(req, res, next);
  }
  next();
});

// POST /mascotas -> Solo Administrador
app.use('/mascotas', verificarToken(['Administrador']), proxy(SERVICIO_MASCOTAS));

// --- RUTAS DE SOLICITUDES ---
// POST /solicitudes -> Usuario Autenticado
app.use('/solicitudes', (req, res, next) => {
  if (req.method === 'POST') {
    return verificarToken()(req, res, next);
  }
  next();
}, (req, res, next) => {
  if (req.method === 'GET') {
    return verificarToken(['Administrador'])(req, res, next);
  }
  next();
}, proxy(SERVICIO_SOLICITUDES));

app.listen(PORT, () => {
  console.log(`🚀 API Gateway corriendo en el puerto ${PORT}`);
});