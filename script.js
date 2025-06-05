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

// Variable para almacenar el marcador actual
let currentMarker = null;
let trackingInterval = null;

// Activar automáticamente la geolocalización al cargar el mapa
map.on('load', () => {
  geolocateControl.trigger();
});

// Función para agregar un marcador personalizado con un color específico
function addCustomMarker(longitude, latitude, color = 'blue') {
  // Crear un elemento HTML para el marcador
  const el = document.createElement('div');
  el.className = 'custom-marker';
  el.style.backgroundColor = color; // Define el color del marcador
  el.style.width = '20px'; // Ajusta el tamaño del marcador
  el.style.height = '20px';
  el.style.borderRadius = '50%'; // Hace que sea un círculo

  // Agregar el marcador al mapa
  return new mapboxgl.Marker(el)
    .setLngLat([longitude, latitude])
    .addTo(map);
}

// Reemplaza el marcador predeterminado con el marcador personalizado para el usuario principal
geolocateControl.on('geolocate', function (e) {
  const longitude = e.coords.longitude;
  const latitude = e.coords.latitude;

  // Eliminar el marcador actual si existe
  if (currentMarker) {
    currentMarker.remove();
  }

  // Agregar un marcador azul para el usuario principal
  currentMarker = addCustomMarker(longitude, latitude, 'blue');

  // Mostrar la ubicación y el ID del usuario en el panel de información
  document.getElementById('location-info').innerHTML =
    `<strong>Tu ID:</strong> ${userId}<br>` +
    `<strong>Latitud:</strong> ${latitude.toFixed(6)}<br>` +
    `<strong>Longitud:</strong> ${longitude.toFixed(6)}`;

  // Obtener la dirección del usuario principal
  fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxgl.accessToken}`)
    .then(response => response.json())
    .then(data => {
      const address = data.features[0]?.place_name || 'Dirección no disponible';
      document.getElementById('location-info').innerHTML += `<strong>Dirección:</strong> ${address}`;
    })
    .catch(err => console.error('Error al obtener la dirección:', err));
});

// Función para iniciar el seguimiento en tiempo real del otro usuario
function startRealTimeTracking() {
  const searchUserId = document.getElementById('search-user-id').value;
  if (!searchUserId) {
    document.getElementById('search-result').innerHTML = 'Por favor, introduce una ID válida.';
    return;
  }

  // Limpiar cualquier intervalo previo
  if (trackingInterval) {
    clearInterval(trackingInterval);
  }

  // Iniciar un intervalo para actualizar la ubicación cada 5 segundos
  trackingInterval = setInterval(() => {
    fetch(`https://proyecto-usm.onrender.com/get-location/${searchUserId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Usuario no encontrado');
        }
        return response.json();
      })
      .then(location => {
        const { latitude, longitude } = location;

        // Centrar el mapa en la ubicación del usuario buscado
        map.flyTo({
          center: [longitude, latitude],
          zoom: 14
        });

        // Eliminar el marcador actual si existe
        if (currentMarker) {
          currentMarker.remove();
        }

        // Agregar un marcador naranja para el otro usuario
        currentMarker = addCustomMarker(longitude, latitude, 'orange');

        // Mostrar la ubicación del usuario buscado en el panel de información
        document.getElementById('search-result').innerHTML =
          `<strong>Ubicación del usuario ${searchUserId}:</strong><br>` +
          `<strong>Latitud:</strong> ${latitude.toFixed(6)}<br>` +
          `<strong>Longitud:</strong> ${longitude.toFixed(6)}`;

        // Obtener la dirección del usuario buscado
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxgl.accessToken}`)
          .then(response => response.json())
          .then(data => {
            const address = data.features[0]?.place_name || 'Dirección no disponible';
            document.getElementById('search-result').innerHTML += `<br><strong>Dirección:</strong> ${address}`;
          })
          .catch(err => console.error('Error al obtener la dirección:', err));
      })
      .catch(err => {
        console.error(err);
        document.getElementById('search-result').innerHTML =
          `<strong>Error:</strong> No se pudo localizar al usuario.`;
      });
  }, 5000); // Actualizar cada 5 segundos
}
