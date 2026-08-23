// ==================== LOADER ==================== 
        window.addEventListener('load', () => {
            setTimeout(() => {
                const loader = document.getElementById('loader');
                loader.classList.add('hide');
            }, 2500);
        });

        // Animate logo in loader with rotation
        const loaderLogoImg = document.getElementById('loaderLogoImg');
        let loaderAngle = 0;

        function animateLoaderLogo() {
            loaderAngle += 2;
            loaderLogoImg.style.transform = `rotate(${loaderAngle}deg)`;
            requestAnimationFrame(animateLoaderLogo);
        }
        animateLoaderLogo();

        // ==================== SCROLL PROGRESS BAR ==================== 
        window.addEventListener('scroll', () => {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrolled = (window.scrollY / scrollHeight) * 100;
            document.querySelector('.scroll-progress').style.width = scrolled + '%';
        });

        // ==================== MOUSE GLOW ==================== 
        const mouseGlow = document.querySelector('.mouse-glow');
        document.addEventListener('mousemove', (e) => {
            mouseGlow.style.left = (e.clientX - 75) + 'px';
            mouseGlow.style.top = (e.clientY - 75) + 'px';
        });

        // ==================== HERO CANVAS ==================== 
        const heroCanvas = document.getElementById('heroCanvas');
        const heroCtx = heroCanvas.getContext('2d');

        function resizeHeroCanvas() {
            heroCanvas.width = heroCanvas.offsetWidth;
            heroCanvas.height = heroCanvas.offsetHeight;
        }
        resizeHeroCanvas();
        window.addEventListener('resize', resizeHeroCanvas);

        const nodes = [];
        const numNodes = 15;

        for (let i = 0; i < numNodes; i++) {
            nodes.push({
                x: Math.random() * heroCanvas.width,
                y: Math.random() * heroCanvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                radius: Math.random() * 3 + 2
            });
        }

        function drawHeroCanvas() {
            heroCtx.fillStyle = 'rgba(10, 14, 39, 0.1)';
            heroCtx.fillRect(0, 0, heroCanvas.width, heroCanvas.height);

            // Update and draw nodes
            nodes.forEach(node => {
                node.x += node.vx;
                node.y += node.vy;

                if (node.x < 0 || node.x > heroCanvas.width) node.vx *= -1;
                if (node.y < 0 || node.y > heroCanvas.height) node.vy *= -1;

                heroCtx.fillStyle = '#00d9ff';
                heroCtx.shadowColor = '#00d9ff';
                heroCtx.shadowBlur = 10;
                heroCtx.beginPath();
                heroCtx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                heroCtx.fill();
            });

            // Draw connections
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        heroCtx.strokeStyle = `rgba(0, 217, 255, ${1 - distance / 150})`;
                        heroCtx.lineWidth = 1;
                        heroCtx.beginPath();
                        heroCtx.moveTo(nodes[i].x, nodes[i].y);
                        heroCtx.lineTo(nodes[j].x, nodes[j].y);
                        heroCtx.stroke();
                    }
                }
            }

            heroCtx.shadowColor = 'transparent';
            requestAnimationFrame(drawHeroCanvas);
        }
        drawHeroCanvas();

        // ==================== STAT COUNTERS ==================== 
        function animateCounter(element, target, duration = 2000) {
            let current = 0;
            const increment = target / (duration / 16);
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    element.textContent = target;
                    clearInterval(timer);
                } else {
                    element.textContent = Math.floor(current);
                }
            }, 16);
        }

        // Trigger counters when in view
        const observerOptions = {
            threshold: 0.5
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.target.classList.contains('stat')) {
                    const statNumber = entry.target.querySelector('.stat-number');
                    if (!statNumber.dataset.animated) {
                        if (entry.target.id === 'statDomains' || entry.target.parentElement.id === 'statDomains') {
                            animateCounter(document.getElementById('statDomains'), 6);
                        } else if (entry.target.id === 'statProjects' || entry.target.parentElement.id === 'statProjects') {
                            animateCounter(document.getElementById('statProjects'), 5);
                        }
                        statNumber.dataset.animated = 'true';
                    }
                }
            });
        }, observerOptions);

        document.querySelectorAll('.stat').forEach(stat => observer.observe(stat));

        // Animate counters on load if visible
        setTimeout(() => {
            animateCounter(document.getElementById('statDomains'), 6);
            animateCounter(document.getElementById('statProjects'), 5);
        }, 500);

        // ==================== SCROLL FADE ANIMATIONS ==================== 
        const fadeElements = document.querySelectorAll('.fade-in');

        const fadeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                }
            });
        }, { threshold: 0.1 });

        fadeElements.forEach(element => fadeObserver.observe(element));

        // ==================== HAMBURGER MENU ==================== 
        const hamburger = document.getElementById('hamburger');
        const nav = document.getElementById('nav');

        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            nav.classList.toggle('active');
        });

        // Close menu on link click
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                nav.classList.remove('active');
            });
        });

        // ==================== BACK TO TOP ==================== 
        const backToTopButton = document.getElementById('backToTop');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopButton.classList.add('show');
            } else {
                backToTopButton.classList.remove('show');
            }
        });

        backToTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // ==================== FAQ ACCORDION ==================== 
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const faqItem = question.parentElement;
                const isActive = faqItem.classList.contains('active');

                // Close all other FAQs
                document.querySelectorAll('.faq-item').forEach(item => {
                    item.classList.remove('active');
                });

                // Toggle current FAQ
                if (!isActive) {
                    faqItem.classList.add('active');
                }
            });
        });

        // ==================== TESTIMONIALS CAROUSEL ==================== 
        let currentTestimonial = 0;
        const testimonials = document.querySelectorAll('.testimonial-card');
        const testimonialDots = document.querySelectorAll('.testimonial-dot');

        function showTestimonial(index) {
            testimonials.forEach(card => card.classList.remove('active'));
            testimonialDots.forEach(dot => dot.classList.remove('active'));

            testimonials[index].classList.add('active');
            testimonialDots[index].classList.add('active');
        }

        function changeTestimonial(index) {
            currentTestimonial = index;
            showTestimonial(currentTestimonial);
        }

        // Auto-rotate testimonials
        setInterval(() => {
            currentTestimonial = (currentTestimonial + 1) % testimonials.length;
            showTestimonial(currentTestimonial);
        }, 5000);

        // ==================== PROJECT EXPLORER ==================== 
        const projectModal = document.getElementById('projectModal');
        const modalTitle = document.getElementById('modalProjectTitle');
        const modalDescription = document.getElementById('modalProjectDescription');
        const modalAbstract = document.getElementById('modalProjectAbstract');
        const modalDetails = document.getElementById('modalProjectDetails');
        const modalOutcomes = document.getElementById('modalProjectOutcomes');
        const savedProjects = document.getElementById('savedProjects');
        const emptyProjects = document.getElementById('emptyProjects');
        let selectedProject = '';
        let savedProjectNames = new Set(JSON.parse(localStorage.getItem('neuralNexusSavedProjects') || '[]'));

        function updateSavedProjects() {
            const total = savedProjectNames.size;
            savedProjects.textContent = `${total} project${total === 1 ? '' : 's'} saved`;
            localStorage.setItem('neuralNexusSavedProjects', JSON.stringify([...savedProjectNames]));
        }

        document.querySelectorAll('.filter-button').forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.dataset.filter;
                let visibleCount = 0;
                document.querySelectorAll('.project-card').forEach(card => {
                    const visible = filter === 'all' || card.dataset.category.split(' ').includes(filter);
                    card.hidden = !visible;
                    if (visible) visibleCount += 1;
                });
                document.querySelectorAll('.filter-button').forEach(item => item.classList.remove('active'));
                button.classList.add('active');
                emptyProjects.hidden = visibleCount !== 0;
            });
        });

        document.querySelectorAll('.project-action').forEach(button => {
            button.addEventListener('click', () => {
                const card = button.closest('.project-card');
                selectedProject = card.querySelector('h3').textContent;
                modalTitle.textContent = selectedProject;
                modalDescription.textContent = card.querySelector('p').textContent;
                modalAbstract.textContent = card.dataset.abstract;
                modalDetails.replaceChildren(...card.dataset.details.split('|').map(detail => {
                    const item = document.createElement('li');
                    item.textContent = detail;
                    return item;
                }));
                modalOutcomes.replaceChildren(...card.dataset.outcomes.split('|').map(outcome => {
                    const item = document.createElement('li');
                    item.textContent = outcome;
                    return item;
                }));
                savedProjectNames.add(selectedProject);
                updateSavedProjects();
                projectModal.classList.add('open');
                document.getElementById('closeProjectModal').focus();
            });
        });

        function closeProjectModal() {
            projectModal.classList.remove('open');
        }

        function beginEnquiry(message, requestType = 'Consultation') {
            document.getElementById('requestType').value = requestType;
            messageField.value = message;
            updateMessageCount();
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => document.getElementById('name').focus(), 500);
        }

        document.getElementById('closeProjectModal').addEventListener('click', closeProjectModal);
        projectModal.addEventListener('click', event => {
            if (event.target === projectModal) closeProjectModal();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeProjectModal();
        });

        document.getElementById('enquireProject').addEventListener('click', () => {
            closeProjectModal();
            beginEnquiry(`I'd like to discuss the ${selectedProject} project.`, 'Project delivery');
        });

        document.querySelectorAll('.plan-button').forEach(button => {
            button.addEventListener('click', () => {
                const projectType = button.closest('.pricing-card').querySelector('h3').textContent;
                beginEnquiry(`I'd like a quotation for ${projectType}. My required features are: `, 'Project delivery');
            });
        });

        document.getElementById('customProjectIdea').addEventListener('click', () => {
            beginEnquiry('I have a custom project idea. My requirements and features are: ', 'Project delivery');
        });

        document.querySelectorAll('.service-card, .program-item').forEach(card => {
            const title = card.querySelector('h3, h4').textContent.trim();
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `Enquire about ${title}`);
            const startCardEnquiry = () => beginEnquiry(
                `I'd like to learn more about ${title}.`,
                card.classList.contains('program-item') ? 'Training' : 'Consultation'
            );
            card.addEventListener('click', startCardEnquiry);
            card.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    startCardEnquiry();
                }
            });
        });

        updateSavedProjects();

        // ==================== CONTACT FORM ==================== 
        const contactForm = document.getElementById('contactForm');
        const formSuccess = document.getElementById('formSuccess');
        const messageField = document.getElementById('message');
        const messageCount = document.getElementById('messageCount');
        const formDraft = document.getElementById('formDraft');

        function validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        function updateMessageCount() {
            messageCount.textContent = `${messageField.value.length} / ${messageField.maxLength}`;
        }

        messageField.addEventListener('input', updateMessageCount);
        updateMessageCount();

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            let isValid = true;
            const name = document.getElementById('name');
            const email = document.getElementById('email');
            const message = messageField;

            // Clear previous errors
            document.querySelectorAll('.form-group').forEach(group => {
                group.classList.remove('error');
            });

            // Validate name
            if (name.value.trim() === '') {
                name.parentElement.classList.add('error');
                isValid = false;
            }

            // Validate email
            if (!validateEmail(email.value)) {
                email.parentElement.classList.add('error');
                isValid = false;
            }

            // Validate message
            if (message.value.trim() === '') {
                message.parentElement.classList.add('error');
                isValid = false;
            }

            if (isValid) {
                const activeSession = JSON.parse(sessionStorage.getItem('neuralNexusSession') || 'null');
                const enquiry = {
                    name: name.value.trim(),
                    email: email.value.trim(),
                    requestType: document.getElementById('requestType').value,
                    timeline: document.getElementById('timeline').value,
                    message: message.value.trim(),
                    submittedAt: new Date().toISOString(),
                    userId: activeSession && activeSession.role === 'user' ? activeSession.id : null
                };
                localStorage.setItem('neuralNexusLatestEnquiry', JSON.stringify(enquiry));
                const leads = JSON.parse(localStorage.getItem('neuralNexusLeads') || '[]');
                leads.unshift({ id: Date.now(), status: 'New', ...enquiry });
                localStorage.setItem('neuralNexusLeads', JSON.stringify(leads));
                formSuccess.classList.add('show');
                formDraft.textContent = `Saved ${enquiry.requestType.toLowerCase()} request for ${enquiry.name}.`;
                formDraft.classList.add('show');
                contactForm.reset();
                updateMessageCount();

                setTimeout(() => {
                    formSuccess.classList.remove('show');
                }, 5000);
            }
        });

        // ==================== SMOOTH SCROLL LINKS ==================== 
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href !== '#') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
