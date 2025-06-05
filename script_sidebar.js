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
document.getElementById('menu-btn').addEventListener('click', function() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    // Si se colapsa, cierra todos los submenús pero recuerda el abierto
    if (sidebar.classList.contains('collapsed')) {
        document.querySelectorAll('.menu-item-dropdown.open').forEach(item => {
            item.classList.remove('open');
        });
    } else {
        // Si se expande y había uno abierto antes, lo reabre
        if (lastOpenDropdown) {
            lastOpenDropdown.classList.add('open');
        }
    }
});

const sidebar = document.getElementById('sidebar');
const mainIframe = document.getElementById('main-iframe');

mainIframe.addEventListener('load', function () {
  // Verifica si la página cargada es settings.html
  const currentPage = mainIframe.contentWindow.location.pathname;
  if (currentPage.endsWith('settings.html')) {
    sidebar.style.display = 'none';
  } else {
    sidebar.style.display = '';
  }
});