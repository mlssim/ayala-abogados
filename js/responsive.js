/* ============================================
   AYALA ABOGADOS - RESPONSIVE SCRIPTS
   Manejo de menú móvil, sidebar y utilidades
   ============================================ */

(function() {
    'use strict';

    // ===== MENÚ MÓVIL =====
    function initMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const mobileNav = document.getElementById('mobileNav');

        if (!menuToggle || !mobileNav) return;

        // Crear overlay si no existe
        let overlay = document.querySelector('.mobile-nav-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'mobile-nav-overlay';
            document.body.appendChild(overlay);
        }

        function openMenu() {
            menuToggle.classList.add('active');
            mobileNav.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeMenu() {
            menuToggle.classList.remove('active');
            mobileNav.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        menuToggle.addEventListener('click', function() {
            if (mobileNav.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        overlay.addEventListener('click', closeMenu);

        // Cerrar al hacer clic en un link
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Cerrar con Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
                closeMenu();
            }
        });
    }

    // ===== SIDEBAR ADMIN COLAPSABLE =====
    function initAdminSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');

        if (!sidebar || !sidebarToggle) return;

        // Crear overlay para móvil
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        // Botón hamburguesa para móvil
        let mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (!mobileMenuBtn) {
            mobileMenuBtn = document.createElement('button');
            mobileMenuBtn.className = 'mobile-menu-btn';
            mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            mobileMenuBtn.setAttribute('aria-label', 'Abrir menú');

            const topBarLeft = document.querySelector('.top-bar-left');
            if (topBarLeft) {
                topBarLeft.insertBefore(mobileMenuBtn, topBarLeft.firstChild);
            }
        }

        function openSidebar() {
            sidebar.classList.add('mobile-open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeSidebar() {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        sidebarToggle.addEventListener('click', function() {
            if (window.innerWidth > 992) {
                sidebar.classList.toggle('collapsed');
                localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
            } else {
                closeSidebar();
            }
        });

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', function() {
                if (sidebar.classList.contains('mobile-open')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            });
        }

        overlay.addEventListener('click', closeSidebar);

        // Restaurar estado del sidebar en desktop
        if (window.innerWidth > 992 && localStorage.getItem('sidebarCollapsed') === 'true') {
            sidebar.classList.add('collapsed');
        }

        // Cerrar sidebar al cambiar de tamaño a desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth > 992) {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // ===== USER DROPDOWN =====
    function initUserDropdown() {
        const userMenu = document.getElementById('userMenu');
        const userDropdown = document.getElementById('userDropdown');

        if (!userMenu || !userDropdown) return;

        userMenu.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });

        document.addEventListener('click', function(e) {
            if (!userMenu.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });

        userDropdown.querySelectorAll('.user-dropdown-item').forEach(item => {
            item.addEventListener('click', function() {
                userDropdown.classList.remove('active');
            });
        });
    }

    // ===== TABLAS SCROLLABLES =====
    function initScrollableTables() {
        document.querySelectorAll('.data-table').forEach(table => {
            const parent = table.parentElement;
            if (!parent.classList.contains('table-wrapper') && 
                !parent.classList.contains('table-responsive') && 
                !parent.classList.contains('content-card-body')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-responsive';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });
    }

    // ===== HEADER SCROLL =====
    function initHeaderScroll() {
        const header = document.getElementById('header');
        if (!header) return;

        window.addEventListener('scroll', function() {
            const currentScroll = window.pageYOffset;
            if (currentScroll > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // ===== SCROLL TO TOP =====
    function initScrollTop() {
        const scrollTop = document.getElementById('scrollTop');
        if (!scrollTop) return;

        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 500) {
                scrollTop.classList.add('visible');
            } else {
                scrollTop.classList.remove('visible');
            }
        });

        scrollTop.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ===== ANIMACIONES SCROLL =====
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('.animate');

        if (!animatedElements.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        animatedElements.forEach(el => observer.observe(el));
    }

    // ===== DETECTAR TOUCH =====
    function initTouchDetection() {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            document.body.classList.add('touch-device');
        }
    }

    // ===== INICIALIZAR TODO =====
    function init() {
        initMobileMenu();
        initAdminSidebar();
        initUserDropdown();
        initScrollableTables();
        initHeaderScroll();
        initScrollTop();
        initScrollAnimations();
        initTouchDetection();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
