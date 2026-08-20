const API_URL = 'http://localhost:3000';
let tokenJWT = '';
let rolUsuario = '';
let listaMascotas = [];

function mostrarSeccion(idSeccion) {
  document.querySelectorAll('.seccion').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(idSeccion).classList.remove('hidden');

  if (idSeccion === 'mascotas-section') {
    cargarMascotas();
  } else if (idSeccion === 'solicitud-section') {
    poblarSelectMascotas();
  }
}

function mostrarAlerta(mensaje, esError = false) {
  const alertBox = document.getElementById('alert-box');
  alertBox.textContent = mensaje;
  alertBox.className = `alert ${esError ? 'error' : 'success'}`;
  alertBox.classList.remove('hidden');

  setTimeout(() => {
    alertBox.classList.add('hidden');
  }, 4000);
}

// 1. Cargar Mascotas con lógica de rol
async function cargarMascotas() {
  const grid = document.getElementById('grid-mascotas');
  grid.innerHTML = '<p class="loading">Cargando mascotas...</p>';

  try {
    const res = await fetch(`${API_URL}/mascotas`);
    if (!res.ok) throw new Error('Error al obtener mascotas');
   
    listaMascotas = await res.json();
    grid.innerHTML = '';

    if (listaMascotas.length === 0) {
      grid.innerHTML = '<p>No hay mascotas disponibles en este momento.</p>';
      return;
    }

    listaMascotas.forEach(mascota => {
      const card = document.createElement('div');
      card.className = 'card-mascota';
     
      let botonEliminarHTML = '';
      if (rolUsuario === 'admin') {
        botonEliminarHTML = `
          <button class="btn-delete" onclick="eliminarMascota('${mascota.id || mascota._id}')">
            🗑️ Eliminar
          </button>
        `;
      }

      card.innerHTML = `
        <div>
          <h3>🐶 ${mascota.nombre}</h3>
          <p><strong>Especie:</strong> ${mascota.especie}</p>
          <p><strong>Edad:</strong> ${mascota.edad}</p>
          <span class="badge ${mascota.estado ? mascota.estado.toLowerCase() : 'disponible'}">
            ${mascota.estado || 'Disponible'}
          </span>
        </div>
        ${botonEliminarHTML}
      `;
      grid.appendChild(card);
    });
  } catch (error) {
    grid.innerHTML = '<p>Error al conectar con los microservicios.</p>';
    mostrarAlerta('Asegúrate de que el API Gateway y los microservicios estén activos.', true);
  }
}

// Poblar selector de mascotas por nombre
function poblarSelectMascotas() {
  const select = document.getElementById('select-mascota');
  select.innerHTML = '<option value="">-- Selecciona una mascota --</option>';

  listaMascotas.forEach(mascota => {
    const option = document.createElement('option');
    option.value = mascota.id || mascota._id;
    option.textContent = `${mascota.nombre} (${mascota.especie})`;
    select.appendChild(option);
  });
}

// 2. Iniciar Sesión con detección de rol
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
    rolUsuario = usuario === 'admin' ? 'admin' : 'user';

    document.getElementById('jwt-token-text').textContent = tokenJWT;
    document.getElementById('token-display').classList.remove('hidden');
    document.getElementById('btn-auth').textContent = `👤 ${usuario.toUpperCase()}`;

    // Configurar permisos de interfaz
    const navRegistrar = document.getElementById('nav-registrar');
    const navAdoptar = document.getElementById('nav-adoptar');

    if (rolUsuario === 'admin') {
      navRegistrar.classList.remove('hidden');
      navAdoptar.classList.add('hidden');
    } else {
      navRegistrar.classList.add('hidden');
      navAdoptar.classList.remove('hidden');
    }

    mostrarAlerta(`¡Bienvenido ${usuario}! Permisos aplicados.`);
    mostrarSeccion('mascotas-section');
  } catch (err) {
    mostrarAlerta(err.message, true);
  }
});

// 3. Eliminar Mascota (Solo Admin)
async function eliminarMascota(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta mascota?')) return;

  try {
    const res = await fetch(`${API_URL}/mascotas/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenJWT}` }
    });

    if (!res.ok) throw new Error('Error al eliminar la mascota');

    mostrarAlerta('Mascota eliminada correctamente');
    cargarMascotas();
  } catch (err) {
    mostrarAlerta(err.message, true);
  }
}

// 4. Registrar Mascota (Admin)
document.getElementById('form-mascota').addEventListener('submit', async (e) => {
  e.preventDefault();
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

// 5. Enviar Solicitud de Adopción (Usuario normal)
document.getElementById('form-solicitud').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id_mascota = document.getElementById('select-mascota').value;
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
    mostrarSeccion('mascotas-section');
  } catch (err) {
    mostrarAlerta(err.message, true);
  }
});

cargarMascotas();