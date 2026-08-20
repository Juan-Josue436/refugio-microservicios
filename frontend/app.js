const API_URL = 'http://localhost:3000';
let tokenJWT = '';

// Navegación entre secciones
function mostrarSeccion(idSeccion) {
  document.querySelectorAll('.seccion').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(idSeccion).classList.remove('hidden');

  if (idSeccion === 'mascotas-section') {
    cargarMascotas();
  }
}

// Mostrar alertas informativas
function mostrarAlerta(mensaje, esError = false) {
  const alertBox = document.getElementById('alert-box');
  alertBox.textContent = mensaje;
  alertBox.className = `alert ${esError ? 'error' : 'success'}`;
  alertBox.classList.remove('hidden');

  setTimeout(() => {
    alertBox.classList.add('hidden');
  }, 4000);
}

// 1. Cargar Mascotas desde API Gateway -> servicio-mascotas
async function cargarMascotas() {
  const grid = document.getElementById('grid-mascotas');
  grid.innerHTML = '<p class="loading">Cargando mascotas...</p>';

  try {
    const res = await fetch(`${API_URL}/mascotas`);
    if (!res.ok) throw new Error('Error al obtener mascotas');
    
    const mascotas = await res.json();
    grid.innerHTML = '';

    if (mascotas.length === 0) {
      grid.innerHTML = '<p>No hay mascotas disponibles en este momento.</p>';
      return;
    }

    mascotas.forEach(mascota => {
      const card = document.createElement('div');
      card.className = 'card-mascota';
      card.innerHTML = `
        <div>
          <h3>🐶 ${mascota.nombre}</h3>
          <p><strong>Especie:</strong> ${mascota.especie}</p>
          <p><strong>Edad:</strong> ${mascota.edad}</p>
          <span class="badge ${mascota.estado ? mascota.estado.toLowerCase() : 'disponible'}">
            ${mascota.estado || 'Disponible'}
          </span>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (error) {
    grid.innerHTML = '<p>Error al conectar con los microservicios.</p>';
    mostrarAlerta('Asegúrate de que el API Gateway y los microservicios estén activos.', true);
  }
}

// 2. Iniciar Sesión / Obtener JWT
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usuario = document.getElementById('usuario').value;
  const contrasena = document.getElementById('contrasena').value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, contrasena })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas');

    tokenJWT = data.token;
    document.getElementById('jwt-token-text').textContent = tokenJWT;
    document.getElementById('token-display').classList.remove('hidden');
    document.getElementById('btn-auth').textContent = '✅ Autenticado';

    mostrarAlerta('¡Sesión iniciada con éxito! Token JWT guardado.');
  } catch (err) {
    mostrarAlerta(err.message, true);
  }
});

// 3. Registrar Mascota
document.getElementById('form-mascota').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!tokenJWT) {
    mostrarAlerta('Debes iniciar sesión primero para obtener un Token JWT.', true);
    mostrarSeccion('login-section');
    return;
  }

  const nombre = document.getElementById('nombre-mascota').value;
  const especie = document.getElementById('especie-mascota').value;
  const edad = document.getElementById('edad-mascota').value;

  try {
    const res = await fetch(`${API_URL}/mascotas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenJWT}`
      },
      body: JSON.stringify({ nombre, especie, edad })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar');

    mostrarAlerta('¡Mascota registrada exitosamente!');
    document.getElementById('form-mascota').reset();
    mostrarSeccion('mascotas-section');
  } catch (err) {
    mostrarAlerta(err.message, true);
  }
});

// 4. Enviar Solicitud de Adopción
document.getElementById('form-solicitud').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!tokenJWT) {
    mostrarAlerta('Debes iniciar sesión primero para enviar solicitudes.', true);
    mostrarSeccion('login-section');
    return;
  }

  const id_mascota = document.getElementById('id-mascota').value;
  const mensaje = document.getElementById('mensaje-solicitud').value;

  try {
    const res = await fetch(`${API_URL}/solicitudes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenJWT}`
      },
      body: JSON.stringify({ id_mascota, mensaje })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al enviar solicitud');

    mostrarAlerta('¡Solicitud de adopción enviada con éxito!');
    document.getElementById('form-solicitud').reset();
  } catch (err) {
    mostrarAlerta(err.message, true);
  }
});

// Cargar la lista inicial al iniciar
cargarMascotas();