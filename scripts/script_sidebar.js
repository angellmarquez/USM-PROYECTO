let lastOpenDropdown = null;

// Manejo de submenús y navegación
document.querySelectorAll('.menu-link').forEach(link => {
    link.addEventListener('click', function(e) {
        const parent = this.parentElement;
        const subMenu = parent.querySelector('.sub-menu');
        if (subMenu) {
            // Si tiene submenú, solo despliega/cierra el submenú
            e.preventDefault();
            // Cierra otros submenús
            document.querySelectorAll('.menu-item-dropdown.open').forEach(item => {
                if (item !== parent) item.classList.remove('open');
            });
            parent.classList.toggle('open');
            // Guarda el último abierto
            if (parent.classList.contains('open')) {
                lastOpenDropdown = parent;
            } else {
                lastOpenDropdown = null;
            }
        } else {
            // Si NO tiene submenú, cambia la página normalmente
            const page = this.getAttribute('data-page');
            if (page) {
                e.preventDefault();
                document.getElementById('main-iframe').src = page;
            }
        }
    });
});

// Submenú: cambia de página normalmente
document.querySelectorAll('.sub-menu-link[data-page]').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const page = this.getAttribute('data-page');
        if (page) {
            document.getElementById('main-iframe').src = page;
        }
        // Opcional: cierra el submenú después de seleccionar
        document.querySelectorAll('.menu-item-dropdown.open').forEach(item => {
            item.classList.remove('open');
        });
        lastOpenDropdown = null;
    });
});

// Sidebar collapse/expand
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menu-btn');
const mainIframe = document.getElementById('main-iframe');

// Función para forzar sidebar minimizada y ocultar el botón
function forzarSidebarMinimizada(pagina) {
    // Siempre colapsada
    sidebar.classList.add('collapsed');
    // Oculta el botón de expandir
    if (menuBtn) menuBtn.style.display = 'none';

    // Solo en mapa.html permite expandir
    if (pagina && pagina.endsWith('mapa.html')) {
        sidebar.classList.remove('collapsed');
        if (menuBtn) menuBtn.style.display = '';
    }
}

// Al cargar la página principal, forzar minimizada excepto en mapa
window.addEventListener('DOMContentLoaded', () => {
    // Detecta la página inicial del iframe
    let pagina = mainIframe.getAttribute('src') || '';
    forzarSidebarMinimizada(pagina);
});

// Al cambiar de página en el iframe, forzar minimizada excepto en mapa
mainIframe.addEventListener('load', function () {
    let pagina = '';
    try {
        pagina = mainIframe.contentWindow.location.pathname;
    } catch {
        // Si hay error por cross-origin, usa src
        pagina = mainIframe.getAttribute('src') || '';
    }
    forzarSidebarMinimizada(pagina);

    // Verifica si la página cargada es settings.html
    if (pagina.endsWith('settings.html')) {
        sidebar.style.display = 'none';
    } else {
        sidebar.style.display = '';
    }
});

// Si el usuario intenta expandir la sidebar en otra página, no lo permitas
if (menuBtn) {
    menuBtn.addEventListener('click', function() {
        // Solo permite expandir si está en mapa.html
        let pagina = '';
        try {
            pagina = mainIframe.contentWindow.location.pathname;
        } catch {
            pagina = mainIframe.getAttribute('src') || '';
        }
        if (pagina.endsWith('mapa.html')) {
            sidebar.classList.toggle('collapsed');
        } else {
            sidebar.classList.add('collapsed');
        }
    });
}