// Inicialización del mapa
document.addEventListener('DOMContentLoaded', function() {
    const map = L.map('map').setView([4.663517, -74.054992], 13);

    // Capa base de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Marcadores
    const markers = [
        {
            coords: [4.663517, -74.054992],
            popup: "<b>Sede Principal EAN</b><br>EAN Legacy"
        },
        {
            coords: [4.657855, -74.056303],
            popup: "<b>Laboratorio calle 74</b><br>Laboratorios 1"
        },
        {
            coords: [4.655620, -74.058149],
            popup: "<b>Laboratorio calle 71</b><br>Laboratorios 2"
        }
    ];

    // Añadir marcadores al mapa
    markers.forEach(marker => {
        L.marker(marker.coords)
            .addTo(map)
            .bindPopup(marker.popup);
    });
});

// Configuración de Google Calendar API
const CALENDAR_ID = '422900ef85f7711ccdb7b70ecb3d2d0f65d84871159d0fadc086dc4331ef7a6b@group.calendar.google.com';
const API_KEY = 'AIzaSyBeuU_yuXsfrgF0mXbA5YhrrCRn1NYSy7c';

// Función para cargar eventos del calendario
function loadCalendar() {
    gapi.load('client', () => {
        gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"]
        }).then(() => {
            return gapi.client.calendar.events.list({
                calendarId: CALENDAR_ID,
                timeMin: new Date().toISOString(),
                singleEvents: true,
                orderBy: 'startTime'
            });
        }).then(response => {
            displayEvents(response.result.items);
        }).catch(error => {
            handleCalendarError(error);
        });
    });
}

// Mostrar eventos en el DOM
function displayEvents(events) {
    const container = document.getElementById('calendar-events');
    
    if (!events || events.length === 0) {
        container.innerHTML = '<p>No hay eventos programados</p>';
        return;
    }

    let html = '<ul>';
    events.forEach(event => {
        const start = event.start.dateTime || event.start.date;
        html += `
            <li>
                <strong>${event.summary}</strong>
                <span>${formatDateTime(start)}</span>
                ${event.location ? `<p class="location">📍 ${event.location}</p>` : ''}
            </li>
        `;
    });
    container.innerHTML = html + '</ul>';
}

// Formatear fecha y hora
function formatDateTime(dateString) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

// Manejo de errores
function handleCalendarError(error) {
    console.error("Error al cargar el calendario:", error);
    document.getElementById('calendar-events').innerHTML = `
        <p class="error">Error al cargar los horarios. Por favor intenta nuevamente.</p>
    `;
}

document.getElementById('load-calendar-btn').addEventListener('click', loadCalendar);