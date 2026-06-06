document.addEventListener('DOMContentLoaded', () => {

    const navbar = document.getElementById('navbar');
    const quickLoginPanel = document.getElementById('quickLoginPanel');
    const authLink = document.getElementById('authLink');

    // --- Navbar giriş animasyonu (CSS ile tetiklenir) ---
    requestAnimationFrame(() => {
        navbar?.classList.add('navbar-visible');
        const items = navbar?.querySelectorAll('.nav-item');
        items?.forEach((el, i) => {
            el.style.animationDelay = `${0.05 * (i + 1)}s`;
        });
    });

    // --- Navbar scroll efekti ---
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 80) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }
        lastScroll = currentScroll;
    }, { passive: true });

    // --- Hızlı giriş paneli: dışarı tıklanınca kapat ---
    document.addEventListener('click', (e) => {
        if (!quickLoginPanel?.classList.contains('open')) return;
        const wrap = document.querySelector('.nav-auth-wrap');
        if (wrap && !wrap.contains(e.target)) {
            quickLoginPanel.classList.remove('open');
            quickLoginPanel.setAttribute('aria-hidden', 'true');
            authLink?.setAttribute('aria-expanded', 'false');
        }
    });

    // --- Active Nav Link on Scroll ---
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    function updateActiveNav() {
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');

            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', updateActiveNav);

    // --- Smooth Scroll (Projeler tıklanınca sayfa ortasında gelsin) ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const isProjects = href === '#projects';
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: isProjects ? 'center' : 'start'
                });
                if (isProjects) {
                    target.classList.add('in-view');
                }
            }
        });
    });

    // --- Projeler bölümü görününce yatay kartlara animasyon ---
    const projectsSection = document.getElementById('projects');
    if (projectsSection) {
        const projectsObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                }
            });
        }, { threshold: 0.2, rootMargin: '0px' });
        projectsObserver.observe(projectsSection);
    }

    // --- Projeler: ok butonları + sürükle ile kaydırma (scrollbar yok) ---
    const cardsRow = document.getElementById('projectsCardsRow');
    const prevBtn = document.querySelector('.projects-nav-prev');
    const nextBtn = document.querySelector('.projects-nav-next');

    if (cardsRow) {
        const cardWidth = () => {
            const card = cardsRow.querySelector('.project-card-h');
            return card ? card.offsetWidth + 24 : 344;
        };
        const scrollAmount = () => cardWidth();

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                cardsRow.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                cardsRow.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
            });
        }

        let isDown = false;
        let startX;
        let startScrollLeft;

        cardsRow.addEventListener('mousedown', (e) => {
            if (e.target.closest('a')) return;
            isDown = true;
            cardsRow.classList.add('grabbing');
            startX = e.pageX - cardsRow.offsetLeft;
            startScrollLeft = cardsRow.scrollLeft;
        });

        cardsRow.addEventListener('mouseleave', () => {
            isDown = false;
            cardsRow.classList.remove('grabbing');
        });

        cardsRow.addEventListener('mouseup', () => {
            isDown = false;
            cardsRow.classList.remove('grabbing');
        });

        cardsRow.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - cardsRow.offsetLeft;
            const walk = (x - startX) * 1.2;
            cardsRow.scrollLeft = startScrollLeft - walk;
        });

        cardsRow.addEventListener('touchstart', (e) => {
            if (e.target.closest('a')) return;
            startX = e.touches[0].pageX - cardsRow.offsetLeft;
            startScrollLeft = cardsRow.scrollLeft;
        }, { passive: true });

        cardsRow.addEventListener('touchmove', (e) => {
            const x = e.touches[0].pageX - cardsRow.offsetLeft;
            const walk = (x - startX) * 1.2;
            cardsRow.scrollLeft = startScrollLeft - walk;
        }, { passive: true });
    }

    // --- Parallax Effect for Hero ---
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero-single');
        if (hero && scrolled < window.innerHeight) {
            hero.querySelector('.hero-bg').style.transform = `translateZ(0) translateY(${scrolled * 0.4}px)`;
        }
    });

    // --- High Resolution Image Loading (tek hero arka planı) ---
    function loadHighResImages() {
        const heroBg = document.querySelector('.hero-bg');
        if (!heroBg) return;

        const currentBg = heroBg.style.backgroundImage || getComputedStyle(heroBg).backgroundImage;
        if (!currentBg) return;

        const match = currentBg.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (!match) return;

        const baseImage = match[1];
        const baseName = baseImage.split('/').pop().replace('.png', '');
        const devicePixelRatio = window.devicePixelRatio || 1;
        const viewportWidth = window.innerWidth;

        if (viewportWidth >= 1920 && devicePixelRatio >= 2) {
            const highRes3x = `assets/${baseName}@3x.png`;
            const highRes2x = `assets/${baseName}@2x.png`;
            const testImg = new Image();
            testImg.onload = function () {
                heroBg.style.backgroundImage = `url('${highRes3x}')`;
            };
            testImg.onerror = function () {
                const testImg2x = new Image();
                testImg2x.onload = function () {
                    heroBg.style.backgroundImage = `url('${highRes2x}')`;
                };
                testImg2x.src = highRes2x;
            };
            testImg.src = highRes3x;
        } else if (devicePixelRatio >= 2 || viewportWidth >= 1024) {
            const highRes2x = `assets/${baseName}@2x.png`;
            const testImg = new Image();
            testImg.onload = function () {
                heroBg.style.backgroundImage = `url('${highRes2x}')`;
            };
            testImg.src = highRes2x;
        }
    }

    // Sayfa yüklendiğinde ve pencere boyutu değiştiğinde yüksek çözünürlüklü resimleri yükle
    setTimeout(loadHighResImages, 100);
    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(loadHighResImages, 250);
    });

    // Retina ekran algılama
    if (window.devicePixelRatio > 1) {
        document.documentElement.classList.add('retina');
    }

    // --- Mobile Menu Toggle ---
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navLinksList = document.querySelector('.nav-links');

    if (mobileMenuToggle && navLinksList) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Click event'inin document'a ulaşmasını engelle
            navLinksList.classList.toggle('active');

            // İkon değişimi
            const icon = mobileMenuToggle.querySelector('i');
            if (navLinksList.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
                mobileMenuToggle.setAttribute('aria-expanded', 'true');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Menü dışına tıklanınca kapat
        document.addEventListener('click', (e) => {
            if (navLinksList.classList.contains('active') &&
                !navLinksList.contains(e.target) &&
                !mobileMenuToggle.contains(e.target)) {

                navLinksList.classList.remove('active');
                const icon = mobileMenuToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Linklere tıklanınca menüyü kapat
        navLinksList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinksList.classList.remove('active');
                const icon = mobileMenuToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }
});
