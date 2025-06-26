// Añade tu token de acceso de Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiNG5nM2wiLCJhIjoiY205cTJtN284MWI4dDJqb2J0cWRjZWk2dSJ9.Bk-OJNIYS060ah6qOH3BXw';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [0, 0], // Coordenadas iniciales (se actualizarán)
  zoom: 2 // Zoom inicial (se actualizará)
});

// Añadir control de geolocalización al mapa
const geolocateControl = new mapboxgl.GeolocateControl({
  positionOptions: {
    enableHighAccuracy: true
  },
  trackUserLocation: true,
  showUserHeading: true,
  showAccuracyCircle: true
});

map.addControl(geolocateControl);

// Generar una ID única para el usuario
const userId = localStorage.getItem('userId') || `user-${Date.now()}`;
localStorage.setItem('userId', userId); // Guardar la ID en el almacenamiento local

// Mostrar un mensaje de bienvenida al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('welcome-message').innerHTML =
    `Prueba de funcionamiento de localización en tiempo real`;
});

// Función para alternar la visibilidad del panel de información
function toggleInfoPanel() {
  const infoPanel = document.getElementById('info-panel');
  const isHidden = infoPanel.classList.toggle('hidden');
  localStorage.setItem('infoPanelHidden', isHidden); // Guardar el estado en localStorage
}

// Variable para almacenar el marcador current
let currentMarker = null;
let trackingInterval = null;
let userMarker = null;
let driverMarkers = {}; // Para almacenar los marcadores de los conductores

// Activar automáticamente la geolocalización al cargar el mapa
map.on('load', () => {
  geolocateControl.trigger();

  // Comprobar el rol del usuario y actuar en consecuencia
  fetch('https://usm-proyecto.onrender.com/user-info', { credentials: 'include' })
    .then(res => res.json())
    .then(userInfo => {
      if (userInfo.rol === 'conductor') {
        startSendingLocation();
      }
    })
    .catch(err => console.error("Error obteniendo información del usuario:", err));

  // Empezar a obtener la ubicación de los conductores para todos los usuarios
  setInterval(fetchAndDisplayDrivers, 5000); // Actualizar cada 5 segundos


  // --- BLOQUE PARA TRAZAR LA RUTA DESDE LA UBICACIÓN DEL USUARIO ---
  const destinoNombre = localStorage.getItem('showRouteTo');
  if (destinoNombre) {
    fetch('https://usm-proyecto.onrender.com/api/rutas')
      .then(res => res.json())
      .then(rutas => {
        const destino = rutas.find(r => r.nombre === destinoNombre);
        if (destino && destino.lat && destino.lng) {
          // Definir el callback
          const onGeolocate = (e) => {
            const origen = [e.coords.longitude, e.coords.latitude];
            const destinoCoord = [parseFloat(destino.lng), parseFloat(destino.lat)];
            trazarRuta(origen, destinoCoord);
            localStorage.removeItem('showRouteTo');
            geolocateControl.off('geolocate', onGeolocate); // Quitar el listener
          };
          geolocateControl.on('geolocate', onGeolocate);
          geolocateControl.trigger();
        }
      });
  }
});

// Siempre que cambie la ubicación del usuario, actualiza el marcador azul
geolocateControl.on('geolocate', function (e) {
  const longitude = e.coords.longitude;
  const latitude = e.coords.latitude;

  // Elimina el marcador anterior si existe
  if (userMarker) {
    userMarker.remove();
  }

  // Agrega el marcador azul para el usuario
  userMarker = addCustomMarker(longitude, latitude, 'blue');
});

// Función para agregar un marcador personalizado con un color específico
function addCustomMarker(longitude, latitude, color = 'blue') {
  const el = document.createElement('div');
  el.className = 'custom-marker';
  el.style.backgroundColor = color;
  el.style.width = '20px';
  el.style.height = '20px';
  el.style.borderRadius = '50%';
  el.style.border = '2px solid #fff';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  return new mapboxgl.Marker(el)
    .setLngLat([longitude, latitude])
    .addTo(map);
}

// Función para que los conductores envíen su ubicación periódicamente
function startSendingLocation() {
  navigator.geolocation.watchPosition(position => {
    const { longitude, latitude } = position.coords;
    fetch('https://usm-proyecto.onrender.com/update-location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ longitude, latitude }),
      credentials: 'include'
    }).catch(err => console.error("Error al enviar la ubicación:", err));
  }, err => {
    console.error("Error de geolocalización:", err);
  }, {
    enableHighAccuracy: true
  });
}

// Función para obtener y mostrar la ubicación de todos los conductores
function fetchAndDisplayDrivers() {
  fetch('https://usm-proyecto.onrender.com/get-drivers-locations', { credentials: 'include' })
    .then(res => res.json())
    .then(drivers => {
      drivers.forEach(driver => {
        const driverId = driver.id;
        const location = driver.location.coordinates; // [longitude, latitude]

        if (driverMarkers[driverId]) {
          // Si el marcador ya existe, actualiza su posición
          driverMarkers[driverId].setLngLat(location);
        } else {
          // Si es un nuevo conductor, crea un nuevo marcador
          const el = document.createElement('div');
          el.className = 'driver-marker';
          // Usar la imagen personalizada del autobús
          el.style.backgroundImage = 'url(brand/bus.png)';
          el.style.width = '80px'; // Ancho del ícono del bus
          el.style.height = '35px'; // Alto del ícono del bus
          el.style.backgroundSize = 'contain';
          el.style.backgroundRepeat = 'no-repeat';

          const marker = new mapboxgl.Marker(el)
            .setLngLat(location)
            .setPopup(new mapboxgl.Popup().setText(`${driver.nombre} ${driver.apellido}`))
            .addTo(map);
          
          driverMarkers[driverId] = marker;
        }
      });
    })
    .catch(err => console.error("Error al obtener la ubicación de los conductores:", err));
}


// Función para iniciar el seguimiento en tiempo real del otro usuario
/*
 * Se elimina la función startRealTimeTracking porque la nueva funcionalidad
 * muestra a todos los conductores a la vez, en lugar de seguir a uno solo.
function startRealTimeTracking() {
...
}
*/

// Coordenadas de la estación La California
const laCaliforniaLat = 10.482470;
const laCaliforniaLng = -66.818723;

// Mostrar ruta si viene de routes.html
if (localStorage.getItem('showRouteToCalifornia') === '1') {
  localStorage.removeItem('showRouteToCalifornia');
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      // Centrar el mapa entre el usuario y la estación
      map.flyTo({
        center: [
          (userLng + laCaliforniaLng) / 2,
          (userLat + laCaliforniaLat) / 2
        ],
        zoom: 12
      });

      // Llamar a la API de direcciones de Mapbox (formato: lng,lat;lng,lat)
      fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${userLng},${userLat};${laCaliforniaLng},${laCaliforniaLat}?geometries=geojson&access_token=${mapboxgl.accessToken}`)
        .then(response => response.json())
        .then(data => {
          const route = data.routes[0].geometry;
          // Elimina la ruta anterior si existe
          if (map.getSource('route')) {
            map.removeLayer('route');
            map.removeSource('route');
          }
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: route
            }
          });
          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#05A357',
              'line-width': 6
            }
          });

          // --- SE ELIMINA EL MARCADOR ESTÁTICO DEL USUARIO ---
          // new mapboxgl.Marker({ color: '#0074D9' })
          //   .setLngLat([userLng, userLat])
          //   .setPopup(new mapboxgl.Popup().setText('Tu ubicación'))
          //   .addTo(map);

          // Marcar el destino (La California)
          const laCaliforniaEl = document.createElement('div');
          laCaliforniaEl.style.width = '48px';
          laCaliforniaEl.style.height = '48px';
          laCaliforniaEl.style.borderRadius = '50%';
          laCaliforniaEl.style.overflow = 'hidden';
          laCaliforniaEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          laCaliforniaEl.style.border = '2px solid #fff';
          const img = document.createElement('img');
          img.src = 'brand/California.jpg';
          img.alt = 'La California';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          laCaliforniaEl.appendChild(img);

          const popupContent = `
            <div style="text-align:center;">
              <img src="brand/California.jpg" alt="Estación La California" style="width:180px;max-width:90vw;border-radius:12px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
              <div>
                <strong>Estación: LA CALIFORNIA</strong><br>
                <strong>Precio del pasaje:</strong> Bs. 15,00<br>
                <strong>Hora de salida:</strong> 07:30 AM<br>
                <strong>Punto de referencia:</strong> Frente al Centro Comercial Líder
              </div>
            </div>
          `;

          new mapboxgl.Marker(laCaliforniaEl)
            .setLngLat([laCaliforniaLng, laCaliforniaLat])
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
            .addTo(map);

        })
        .catch(() => {
          alert('No se pudo trazar la ruta.');
        });
    }, function() {
      alert('No se pudo obtener tu ubicación.');
    });
  } else {
    alert('La geolocalización no está soportada en este navegador.');
  }
}

// Marcador interactivo para la estación LA CALIFORNIA
const popupContent = `
  <div style="text-align:center;">
    <img src="brand/California.jpg" alt="Estación La California" style="width:180px;max-width:90vw;border-radius:12px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
    <div>
      <strong>Estación: LA CALIFORNIA</strong><br>
      <strong>Precio del pasaje:</strong> Bs. 15,00<br>
      <strong>Hora de salida:</strong> 07:30 AM<br>
      <strong>Punto de referencia:</strong> Frente al Centro Comercial Líder
    </div>
  </div>
`;

// Crear el popup con animación
const laCaliforniaPopup = new mapboxgl.Popup({ offset: 25 })
  .setHTML(popupContent)
  .addClassName('animated-popup');

// Crear un marcador solo con el número 1 (sin imagen)
const laCaliforniaEl = document.createElement('div');
laCaliforniaEl.style.width = '48px';
laCaliforniaEl.style.height = '48px';
laCaliforniaEl.style.borderRadius = '50%';
laCaliforniaEl.style.background = '#2563eb';
laCaliforniaEl.style.display = 'flex';
laCaliforniaEl.style.alignItems = 'center';
laCaliforniaEl.style.justifyContent = 'center';
laCaliforniaEl.style.color = '#fff';
laCaliforniaEl.style.fontWeight = 'bold';
laCaliforniaEl.style.fontSize = '1.5em';
laCaliforniaEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
laCaliforniaEl.style.border = '2px solid #fff';
laCaliforniaEl.textContent = '1';

// Crear el marcador personalizado solo con el número
const laCaliforniaMarker = new mapboxgl.Marker(laCaliforniaEl)
  .setLngLat([laCaliforniaLng, laCaliforniaLat])
  .setPopup(laCaliforniaPopup)
  .addTo(map);

// Cargar rutas y crear marcadores dinámicos desde la base de datos
fetch('https://usm-proyecto.onrender.com/api/rutas')
  .then(res => res.json())
  .then(rutas => {
    const colorMap = {
        'LA CALIFORNIA': '#2563eb',
        'PLAZA-VENEZUELA': '#22a06b',
        'LOS TEQUES': '#f59e42',
        'CONCRESA': '#e53935',
        'LA GUAIRA': '#a259e4',
        'GUARENAS GUATIRE': '#ffb300',
        'La Hoyada': '#d946ef',
        'Parque Central': '#14b8a6',
        'El Silencio': '#f97316'
    };
    rutas.forEach((ruta, idx) => {
      if (ruta.lat && ruta.lng) {
        // Popup con imagen y datos
        const popupContent = `
          <div style="text-align:center;">
            <img src="${ruta.imagen}" alt="Estación ${ruta.nombre}" style="width:180px;max-width:90vw;border-radius:12px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
            <div>
              <strong>Estación: ${ruta.nombre}</strong><br>
              <strong>Precio del pasaje:</strong> ${ruta.precio}<br>
              <strong>Hora de salida:</strong> ${ruta.hora_salida}<br>
              <strong>Punto de referencia:</strong> ${ruta.ubicacion}<br>
              <button
                class="confirmar-asistencia-popup-btn confirmar-asistencia-btn"
                data-estacion="${ruta.nombre}"
                style="background:#1976d2;color:#fff;border:none;border-radius:8px;font-size:1em;padding:10px 24px;cursor:pointer;margin-top:18px;transition:background 0.2s;"
              >Confirmar asistencia</button>
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(popupContent)
          .addClassName('animated-popup');

        // Crear marcador solo con el número
        const markerEl = document.createElement('div');
        markerEl.style.width = '38px';
        markerEl.style.height = '38px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.background = colorMap[ruta.nombre] || '#2563eb'; // Azul para todas las paradas
        markerEl.style.display = 'flex';
        markerEl.style.alignItems = 'center';
        markerEl.style.justifyContent = 'center';
        markerEl.style.color = '#fff';
        markerEl.style.fontWeight = 'bold';
        markerEl.style.fontSize = '1.2em';
        markerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
        markerEl.textContent = (idx + 1);

        new mapboxgl.Marker(markerEl)
          .setLngLat([parseFloat(ruta.lng), parseFloat(ruta.lat)])
          .setPopup(popup)
          .addTo(map)
          .getElement().addEventListener('click', function () {
            setTimeout(() => {
              const btn = document.querySelector('.confirmar-asistencia-popup-btn[data-estacion="' + ruta.nombre + '"]');
              if (btn) {
                btn.onclick = function(e) {
                  e.stopPropagation();
                  const notificaciones = JSON.parse(localStorage.getItem('notificaciones') || '[]');
                  notificaciones.push({
                    mensaje: `🚌 Confirmación de ingreso enviada para la estación ${ruta.nombre}.<br>¡Buen viaje! Si tienes dudas, acércate al personal de la estación.`,
                    fecha: new Date().toLocaleString(),
                    leida: false
                  });
                  localStorage.setItem('notificaciones', JSON.stringify(notificaciones));
                };
              }
            }, 200);
          });
      }
    });
  });

// Función para trazar la ruta en el mapa
function trazarRuta(origen, destino) {
  // Elimina la ruta anterior si existe
  if (map.getSource('route')) {
    map.removeLayer('route');
    map.removeSource('route');
  }
  fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${origen[0]},${origen[1]};${destino[0]},${destino[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`)
    .then(res => res.json())
    .then(data => {
      const route = data.routes[0].geometry;
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: route
        }
      });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#05A357', 'line-width': 6 }
      });
      // Ajusta el mapa para mostrar toda la ruta
      const coordinates = route.coordinates;
      const bounds = coordinates.reduce(function(bounds, coord) {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
      map.fitBounds(bounds, { padding: 60 });
    });
}

// --- BLOQUE PARA TRAZAR LA RUTA DESDE LA UBICACIÓN DEL USUARIO ---
const destinoNombre = localStorage.getItem('showRouteTo');
if (destinoNombre) {
  fetch('https://usm-proyecto.onrender.com/api/rutas')
    .then(res => res.json())
    .then(rutas => {
      const destino = rutas.find(r => r.nombre === destinoNombre);
      if (destino && destino.lat && destino.lng) {
        // Definir el callback
        const onGeolocate = (e) => {
          const origen = [e.coords.longitude, e.coords.latitude];
          const destinoCoord = [parseFloat(destino.lng), parseFloat(destino.lat)];
          trazarRuta(origen, destinoCoord);
          localStorage.removeItem('showRouteTo');
          geolocateControl.off('geolocate', onGeolocate); // Quitar el listener
        };
        geolocateControl.on('geolocate', onGeolocate);
        geolocateControl.trigger();
      }
    });
}
