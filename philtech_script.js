function toggleMenu() {
    const slideMenu = document.getElementById('slideMenu');
    slideMenu.classList.toggle('active');
}

document.addEventListener('click', function(event) {
    const slideMenu = document.getElementById('slideMenu');
    const menuToggle = document.querySelector('.menu-toggle');
    
    if (slideMenu && menuToggle && !slideMenu.contains(event.target) && !menuToggle.contains(event.target)) {
        slideMenu.classList.remove('active');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

const EMAILJS_CONFIG = {
    publicKey: 'SASjpWCbZVViFvHNh',
    serviceId: 'service_n53mlui', 
    templateId: 'template_inquiry', 
    adminEmail: 'philtechtestwebsite@gmail.com'
};

let contactStorage = [];

function initializeContactForms() {
    const forms = document.querySelectorAll('#contactForm, form[id*="contact"]');
    
    forms.forEach((form, index) => {
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
            console.log(`✅ Form ${index + 1} event listener attached`);
        }
    });
    
    const additionalForms = document.querySelectorAll('.contact-form form, form.contact-form');
    additionalForms.forEach((form, index) => {
        if (form && !form.hasAttribute('data-initialized')) {
            form.setAttribute('data-initialized', 'true');
            form.addEventListener('submit', handleFormSubmit);
            console.log(`✅ Additional contact form ${index + 1} initialized`);
        }
    });
}

function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"], .submit-btn, input[type="submit"]');
    
    if (!submitBtn) {
        console.error('❌ Submit button not found');
        return;
    }
    
    const originalText = submitBtn.textContent || submitBtn.value;
    
    submitBtn.disabled = true;
    if (submitBtn.textContent !== undefined) {
        submitBtn.textContent = 'Sending...';
    } else {
        submitBtn.value = 'Sending...';
    }
    
    const formData = extractFormData(form);
    
    console.log('📝 Form data collected:', formData);
    
    if (!validateFormData(formData)) {
        resetSubmitButton(submitBtn, originalText);
        return;
    }
    
    sendEmails(formData)
        .finally(() => {
            resetSubmitButton(submitBtn, originalText);
        });
}

function extractFormData(form) {
    const data = {
        timestamp: new Date().toLocaleString(),
        inquiryId: generateInquiryId()
    };
    
    const nameField = form.querySelector('#name, input[name="name"], input[placeholder*="Name" i]');
    const emailField = form.querySelector('#email, input[name="email"], input[type="email"]');
    const phoneField = form.querySelector('#phone, input[name="phone"], input[type="tel"]');
    const subjectField = form.querySelector('#subject, select[name="subject"], input[name="subject"]');
    const messageField = form.querySelector('#message, textarea[name="message"], textarea[placeholder*="Message" i]');
    
    data.name = nameField ? nameField.value.trim() : '';
    data.email = emailField ? emailField.value.trim() : '';
    data.phone = phoneField ? phoneField.value.trim() : '';
    data.subject = subjectField ? subjectField.value : '';
    data.message = messageField ? messageField.value.trim() : '';
    
    return data;
}

function resetSubmitButton(submitBtn, originalText) {
    submitBtn.disabled = false;
    if (submitBtn.textContent !== undefined) {
        submitBtn.textContent = originalText;
    } else {
        submitBtn.value = originalText;
    }
}

function validateFormData(data) {
    const requiredFields = ['name', 'email', 'message'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
        showMessage(`Please fill in the following required fields: ${missingFields.join(', ')}`, 'error');
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showMessage('Please enter a valid email address.', 'error');
        return false;
    }
    
    return true;
}

function generateInquiryId() {
    const prefix = 'PHT';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

async function sendEmails(data) {
    try {
        console.log('📧 Starting email process for inquiry:', data.inquiryId);
        
        contactStorage.push({
            timestamp: Date.now(),
            formData: data
        });
        
        if (typeof emailjs === 'undefined' || !emailjs.send) {
            throw new Error('EmailJS service not available');
        }
        
        const results = await Promise.allSettled([
            sendAdminNotification(data),
            sendUserConfirmation(data)
        ]);
        
        const adminResult = results[0];
        const userResult = results[1];
        
        if (adminResult.status === 'fulfilled' && userResult.status === 'fulfilled') {
            showMessage(`✅ Success! Your inquiry #${data.inquiryId} has been submitted. Check your email for confirmation.`, 'success');
        } else if (adminResult.status === 'fulfilled') {
            showMessage(`✅ Your inquiry #${data.inquiryId} has been submitted. Confirmation email may be delayed.`, 'success');
        } else if (userResult.status === 'fulfilled') {
            showMessage(`✅ Confirmation sent to your email. Admin notification may be delayed for inquiry #${data.inquiryId}.`, 'success');
        } else {
            throw new Error('Both email notifications failed');
        }
        
        setTimeout(() => resetForm(), 2000);
        
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        showMessage(`Your inquiry #${data.inquiryId} has been recorded. Email delivery failed. Please contact us directly at ${EMAILJS_CONFIG.adminEmail}`, 'error');
        
        setTimeout(() => resetForm(), 3000);
    }
}

function sendAdminNotification(data) {
    console.log('📨 Sending admin notification...');
    
    const templateParams = {
        to_email: EMAILJS_CONFIG.adminEmail,
        from_name: data.name,
        from_email: data.email,
        phone: data.phone || 'Not provided',
        subject: data.subject ? `New Inquiry: ${data.subject}` : 'New Contact Form Submission',
        message: data.message,
        inquiry_id: data.inquiryId,
        timestamp: data.timestamp,
        reply_to: data.email
    };
    
    return emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        templateParams
    ).then(response => {
        console.log('✅ Admin notification sent:', response.status, response.text);
        return response;
    }).catch(error => {
        console.error('❌ Admin notification failed:', error);
        throw error;
    });
}

function sendUserConfirmation(data) {
    console.log('📨 Sending user confirmation...');
    
    const templateParams = {
        to_email: data.email,
        to_name: data.name,
        inquiry_id: data.inquiryId,
        subject_type: data.subject || 'General Inquiry',
        message_preview: data.message.substring(0, 100) + (data.message.length > 100 ? '...' : ''),
        timestamp: data.timestamp,
        admin_email: EMAILJS_CONFIG.adminEmail,
        school_name: 'Philippine Technological Institute of Science Arts and Trade - Central Inc.'
    };
    
    return emailjs.send(
        EMAILJS_CONFIG.serviceId,
        'template_confirmation', 
        templateParams
    ).then(response => {
        console.log('✅ User confirmation sent:', response.status, response.text);
        return response;
    }).catch(error => {
        console.error('❌ User confirmation failed:', error);
        throw error;
    });
}

function showMessage(message, type = 'info') {
    let messageDiv = document.getElementById('statusMessage');
    
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'statusMessage';
        messageDiv.style.cssText = `
            display: none;
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            padding: 1rem 2rem;
            border-radius: 5px;
            font-weight: bold;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            max-width: 90%;
            text-align: center;
        `;
        document.body.appendChild(messageDiv);
    }
    
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    if (type === 'success') {
        messageDiv.style.backgroundColor = '#d4edda';
        messageDiv.style.color = 'black';
        messageDiv.style.border = '1px solid whitesmoke';
    } else if (type === 'error') {
        messageDiv.style.backgroundColor = '#f8d7da';
        messageDiv.style.color = 'black';
        messageDiv.style.border = '1px solid whitesmoke';
    } else {
        messageDiv.style.backgroundColor = '#d1ecf1';
        messageDiv.style.color = 'black';
        messageDiv.style.border = '1px solid whitesmoke';
    }
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

function resetForm() {
    const forms = document.querySelectorAll('#contactForm, form[id*="contact"], .contact-form form, form.contact-form');
    
    forms.forEach(form => {
        if (form) {
            form.reset();
            console.log('✅ Form reset');
        }
    });
}

function toggleSearch() {
    const searchBar = document.getElementById('searchBar');
    if (!searchBar) return;
    
    const isVisible = searchBar.style.display === 'block';
    searchBar.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        const searchInput = searchBar.querySelector('.search-input');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }
}

function toggleMenu() {
    const slideMenu = document.getElementById('slideMenu');
    if (slideMenu) {
        slideMenu.classList.toggle('active');
    }
}

document.addEventListener('click', function(event) {
    const searchBar = document.getElementById('searchBar');
    const slideMenu = document.getElementById('slideMenu');
    const searchIcon = document.querySelector('.search-icon');
    const menuToggle = document.querySelector('.menu-toggle');
    
    if (searchBar && searchBar.style.display === 'block' && 
        !searchBar.contains(event.target) && 
        searchIcon && !searchIcon.contains(event.target)) {
        searchBar.style.display = 'none';
    }
    
    if (slideMenu && slideMenu.classList.contains('active') && 
        !slideMenu.contains(event.target) && 
        menuToggle && !menuToggle.contains(event.target)) {
        slideMenu.classList.remove('active');
    }
});

function testEmailJS() {
    console.log('🔧 Testing EmailJS Configuration...');
    
    if (typeof emailjs === 'undefined') {
        console.error('❌ EmailJS not loaded');
        return false;
    }
    
    console.log('✅ EmailJS loaded');
    console.log('📧 Service ID:', EMAILJS_CONFIG.serviceId);
    console.log('📧 Template ID:', EMAILJS_CONFIG.templateId);
    console.log('🔑 Public Key:', EMAILJS_CONFIG.publicKey);
    
    return true;
}

window.testEmailJS = testEmailJS;

console.log('📱 Enhanced PhilTech Contact Forms Script Loaded Successfully!');

class FacultyCarousel {
    constructor() {
        this.track = document.getElementById('carouselTrack');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.originalCards = document.querySelectorAll('.faculty-card');
        this.cardWidth = 200; 
        this.visibleCards = 5; 
        this.isAnimating = false;
        this.autoSlideInterval = null;
        this.autoSlideDelay = 3000; 
        this.currentIndex = 0;
        
        this.init();
    }
    
    init() {
        if (!this.track || !this.prevBtn || !this.nextBtn || this.originalCards.length === 0) {
            console.warn('Carousel elements not found');
            return;
        }
        
        this.createInfiniteLoop();
        this.setupEventListeners();
        this.updateCarousel();
        this.startAutoSlide();
    }
    
    createInfiniteLoop() {
       
        const fragment = document.createDocumentFragment();
        
        for (let i = this.originalCards.length - this.visibleCards; i < this.originalCards.length; i++) {
            const clone = this.originalCards[i].cloneNode(true);
            clone.classList.add('clone');
            fragment.appendChild(clone);
        }
        
        this.originalCards.forEach(card => {
            fragment.appendChild(card.cloneNode(true));
        });
        
        for (let i = 0; i < this.visibleCards; i++) {
            const clone = this.originalCards[i].cloneNode(true);
            clone.classList.add('clone');
            fragment.appendChild(clone);
        }
        
        this.track.innerHTML = '';
        this.track.appendChild(fragment);
        
        this.allCards = this.track.querySelectorAll('.faculty-card');
        
        this.currentIndex = this.visibleCards;
        
        this.track.style.setProperty('--total-cards', this.allCards.length);
    }
    
    setupEventListeners() {
        this.prevBtn.addEventListener('click', () => this.prevSlide());
        this.nextBtn.addEventListener('click', () => this.nextSlide());
        
        const carouselWrapper = document.querySelector('.carousel-wrapper');
        if (carouselWrapper) {
            carouselWrapper.addEventListener('mouseenter', () => this.stopAutoSlide());
            carouselWrapper.addEventListener('mouseleave', () => this.startAutoSlide());
        }
        
        window.addEventListener('resize', () => this.handleResize());
        
        this.setupTouchEvents();
    }
    
    setupTouchEvents() {
        let startX = 0;
        let endX = 0;
        const threshold = 50; 
        
        this.track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            this.stopAutoSlide();
        });
        
        this.track.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            const deltaX = startX - endX;
            
            if (Math.abs(deltaX) > threshold) {
                if (deltaX > 0) {
                    this.nextSlide();
                } else {
                    this.prevSlide();
                }
            }
            
            this.startAutoSlide();
        });
        
        this.track.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });
    }
    
    nextSlide() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.currentIndex++;
        
        this.updateCarousel();
        
        setTimeout(() => {
            this.handleInfiniteLoop();
            this.isAnimating = false;
        }, 500);
    }
    
    prevSlide() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.currentIndex--;
        
        this.updateCarousel();
        
        setTimeout(() => {
            this.handleInfiniteLoop();
            this.isAnimating = false;
        }, 500);
    }
    
    updateCarousel() {
        const offset = -this.currentIndex * this.cardWidth;
        this.track.style.transform = `translateX(${offset}px)`;
        
        this.updateCenterCard();
    }
    
    updateCenterCard() {
        this.allCards.forEach(card => card.classList.remove('center'));
        
        const centerIndex = this.currentIndex + 2; 
        if (this.allCards[centerIndex]) {
            this.allCards[centerIndex].classList.add('center');
        }
    }
    
    handleInfiniteLoop() {
        const totalOriginalCards = this.originalCards.length;
        
        if (this.currentIndex >= totalOriginalCards + this.visibleCards) {
            this.track.style.transition = 'none';
            this.currentIndex = this.visibleCards;
            this.updateCarousel();

            setTimeout(() => {
                this.track.style.transition = 'transform 0.5s ease-in-out';
            }, 10);
        }
        
        if (this.currentIndex < this.visibleCards) {
            this.track.style.transition = 'none';
            this.currentIndex = totalOriginalCards;
            this.updateCarousel();
            
            setTimeout(() => {
                this.track.style.transition = 'transform 0.5s ease-in-out';
            }, 10);
        }
    }
    
    startAutoSlide() {
        this.stopAutoSlide(); 
        this.autoSlideInterval = setInterval(() => {
            this.nextSlide();
        }, this.autoSlideDelay);
    }
    
    stopAutoSlide() {
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
            this.autoSlideInterval = null;
        }
    }
    
    handleResize() {
        const screenWidth = window.innerWidth;
        
        if (screenWidth <= 768) {
            this.cardWidth = 140; 
            this.visibleCards = 3;
        } else if (screenWidth <= 1024) {
            this.cardWidth = 180; 
            this.visibleCards = 5; 
        } else {
            this.cardWidth = 200;
            this.visibleCards = 5; 
        }
        
        this.updateCarousel();
    }
}

function showLoading(element) {
    if (element) {
        element.style.opacity = '0.5';
        element.style.pointerEvents = 'none';
    }
}

function hideLoading(element) {
    if (element) {
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactFormSubmit);
    }
    
    const carousel = new FacultyCarousel();
    
    document.documentElement.style.scrollBehavior = 'smooth';
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    const animatedElements = document.querySelectorAll('.faculty-section, .welcome-banner');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(el);
    });
    
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
        img.addEventListener('error', function() {
            
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAxMDBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
            this.alt = 'Image not available';
            console.warn('Failed to load image:', this.src);
        });
        
        img.style.transition = 'opacity 0.3s ease';
        img.addEventListener('load', function() {
            this.style.opacity = '1';
        });
    });
    
    lazyLoadImages();
});

function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    if (images.length === 0) return;
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

window.viewAllSavedMessages = viewAllSavedMessages;
window.exportAllMessages = exportAllMessages;
window.clearAllSavedMessages = clearAllSavedMessages;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        toggleMenu,
        FacultyCarousel
    };
}

let currentSlideIndex = 1;

function showSlide(n) {
    const slides = document.querySelectorAll('.poster-slide');
    const dots = document.querySelectorAll('.dot');
    
    if (n > slides.length) {
        currentSlideIndex = 1;
    }
    if (n < 1) {
        currentSlideIndex = slides.length;
    }
    
    slides.forEach(slide => {
        slide.classList.remove('active');
    });
    
    dots.forEach(dot => {
        dot.classList.remove('active');
    });
    
    if (slides[currentSlideIndex - 1]) {
        slides[currentSlideIndex - 1].classList.add('active');
    }
    if (dots[currentSlideIndex - 1]) {
        dots[currentSlideIndex - 1].classList.add('active');
    }
}

function nextSlide() {
    currentSlideIndex++;
    showSlide(currentSlideIndex);
}

function prevSlide() {
    currentSlideIndex--;
    showSlide(currentSlideIndex);
}

function currentSlide(n) {
    currentSlideIndex = n;
    showSlide(currentSlideIndex);
}

function autoPlayCarousel() {
    setInterval(() => {
        nextSlide();
    }, 5000); 
}

document.addEventListener('DOMContentLoaded', function() {
    showSlide(currentSlideIndex);
});

(function() {
    'use strict';

    let originalContent = {};
    let searchResultsContainer = null;
    let currentHighlights = [];
    let debounceTimer = null;

    const fileContentMap = {
        'apply': { file: 'philtech_apply.html', title: 'Pre Application Form' },
        'application': { file: 'philtech_apply.html', title: 'Pre Application Form' },
        'inquire': { file: 'philtech_inquire.html', title: 'Get In Touch' },
        'contact us': { file: 'philtech_inquire.html', title: 'Contact Us' },
        'contact': { file: 'philtech_inquire.html', title: 'Contact Us' },
        'home': { file: 'philtech_home.html', title: 'Home' },
        'vision': { file: 'philtech_discover.html', title: 'Vision' },
        'mission': { file: 'philtech_discover.html', title: 'Mission' },
        'discover': { file: 'philtech_discover.html', title: 'Discover' },
        'faculty': { file: 'philtech_discover.html', title: 'Our Faculty' },
        'our faculty': { file: 'philtech_discover.html', title: 'Our Faculty' },
        'michael atienza': { file: 'philtech_discover.html', title: 'Our Faculty - Michael Atienza' },
        'nstp and pathfit teacher': { file: 'philtech_discover.html', title: 'Our Faculty - NSTP & PATHFIT' },
        'jude rodriguez': { file: 'philtech_discover.html', title: 'Our Faculty - Jude Rodriguez' },
        'mathematics teacher': { file: 'philtech_discover.html', title: 'Our Faculty - Mathematics' },
        'honorio lacerna': { file: 'philtech_discover.html', title: 'Our Faculty - Honorio Lacerna' },
        'english teacher': { file: 'philtech_discover.html', title: 'Our Faculty - English' },
        'gerald ello': { file: 'philtech_discover.html', title: 'Our Faculty - Gerald Ello' },
        'practical research teacher': { file: 'philtech_discover.html', title: 'Our Faculty - Practical Research' },
        'ephraim icabande': { file: 'philtech_discover.html', title: 'Our Faculty - Ephraim Icabande' },
        'rainiel gordon': { file: 'philtech_discover.html', title: 'Our Faculty - Rainiel Gordon' },
        'home economics teacher': { file: 'philtech_discover.html', title: 'Our Faculty - Home Economics' },
        'edith yabut': { file: 'philtech_discover.html', title: 'Our Faculty - Edith Yabut' },
        'filipino teacher': { file: 'philtech_discover.html', title: 'Our Faculty - Filipino' },
        'grace rivera': { file: 'philtech_discover.html', title: 'Our Faculty - Grace Rivera' },
        'joy magno': { file: 'philtech_discover.html', title: 'Our Faculty - Joy Magno' },
        'raiven gordon': { file: 'philtech_discover.html', title: 'Our Faculty - Raiven Gordon' },
        'computer science teacher': { file: 'philtech_discover.html', title: 'Our Faculty - Computer Science' },
        'francis jun patalen': { file: 'philtech_discover.html', title: 'Our Faculty - Francis Jun Patalen' },
        'history': { file: 'philtech_home.html', title: 'School History' },
        'school history': { file: 'philtech_home.html', title: 'School History' },
        'school map': { file: 'philtech_discover.html', title: 'School Map' },
        'map': { file: 'philtech_discover.html', title: 'School Map' },
        'gma': { file: 'philtech_discover.html', title: 'Philtech - G.M.A' },
        'tanay': { file: 'philtech_discover.html', title: 'Philtech - Tanay' },
        'admission': { file: 'philtech_admission.html', title: 'Admission' },
        'criteria': { file: 'philtech_admission.html', title: 'Admission Criteria' },
        'admission criteria': { file: 'philtech_admission.html', title: 'Admission Criteria' },
        'requirements': { file: 'philtech_admission.html', title: 'Admission Requirements' },
        'curriculum': { file: 'philtech_admission.html', title: 'Curriculum for College' },
        'curriculum for college': { file: 'philtech_admission.html', title: 'Curriculum for College' },
        'bachelor of science in office administration': { file: 'philtech_admission.html', title: 'Bachelor of Science in Office Administration' },
        'office administration': { file: 'philtech_admission.html', title: 'Bachelor of Science in Office Administration' },
        'bsoa': { file: 'philtech_admission.html', title: 'Bachelor of Science in Office Administration' },
        'bachelor of science in computer science': { file: 'philtech_admission.html', title: 'Bachelor of Science in Computer Science' },
        'computer science': { file: 'philtech_admission.html', title: 'Bachelor of Science in Computer Science' },
        'bscs': { file: 'philtech_admission.html', title: 'Bachelor of Science in Computer Science' },
        'bachelor of technical vocational teacher education': { file: 'philtech_admission.html', title: 'Bachelor of Technical Vocational Teacher Education' },
        'technical vocational teacher education': { file: 'philtech_admission.html', title: 'Bachelor of Technical Vocational Teacher Education' },
        'btvted': { file: 'philtech_admission.html', title: 'Bachelor of Technical Vocational Teacher Education' },
        'major in food and service management': { file: 'philtech_admission.html', title: 'Major in Food and Service Management' },
        'food and service management': { file: 'philtech_admission.html', title: 'Major in Food and Service Management' },
        'offers': { file: 'philtech_offers.html', title: 'Offers' },
        'posters': { file: 'philtech_offers.html', title: 'Our Poster' },
        'our poster': { file: 'philtech_offers.html', title: 'Our Poster' },
        'poster': { file: 'philtech_offers.html', title: 'Our Poster' },
        'senior high school': { file: 'philtech_offers.html', title: 'Senior High School' },
        'shs': { file: 'philtech_offers.html', title: 'Senior High School' },
        'strands': { file: 'philtech_offers.html', title: 'Strands' },
        'information and communication technology': { file: 'philtech_offers.html', title: 'Information and Communication Technology' },
        'ict': { file: 'philtech_offers.html', title: 'Information and Communication Technology' },
        'humanities and social sciences': { file: 'philtech_offers.html', title: 'Humanities and Social Sciences' },
        'humss': { file: 'philtech_offers.html', title: 'Humanities and Social Sciences' },
        'home economics': { file: 'philtech_offers.html', title: 'Home Economics' },
        'he': { file: 'philtech_offers.html', title: 'Home Economics' },
        'general academic strand': { file: 'philtech_offers.html', title: 'General Academic Strand' },
        'gas': { file: 'philtech_offers.html', title: 'General Academic Strand' },
        'accountancy business and management': { file: 'philtech_offers.html', title: 'Accountancy, Business and Management' },
        'abm': { file: 'philtech_offers.html', title: 'Accountancy, Business and Management' },
        'college': { file: 'philtech_offers.html', title: 'College' },
        'courses': { file: 'philtech_offers.html', title: 'Courses' },
        'connect': { file: 'philtech_connect.html', title: 'Connect with Philtech' },
        'developer': { file: 'philtech_developer.html', title: 'Developer' }
    };

    function initializeSearch() {
        const searchInput = document.querySelector('.search-input');
        const searchBtn = document.querySelector('.search-btn');
        
        if (!searchInput) {
            console.warn('Search input not found. Make sure .search-input element exists.');
            return;
        }

        storeOriginalContent();
        
        searchInput.addEventListener('input', debounceSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(debounceTimer);
                handleSearch();
            }
        });
        
        if (searchBtn) {
            searchBtn.addEventListener('click', function(e) {
                e.preventDefault();
                clearTimeout(debounceTimer);
                handleSearch();
            });
        }
        
        createSearchResultsContainer();
    }

    function debounceSearch() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleSearch, 300);
    }

    function storeOriginalContent() {
        const sections = document.querySelectorAll('section, .criteria-card, .curriculum-card, .program-section');
        sections.forEach((section, index) => {
            if (section && section.innerHTML) {
                originalContent[index] = {
                    element: section,
                    originalHTML: section.innerHTML
                };
            }
        });
    }

    function createSearchResultsContainer() {
        const existingContainer = document.getElementById('search-results');
        if (existingContainer) {
            existingContainer.remove();
        }

        searchResultsContainer = document.createElement('div');
        searchResultsContainer.id = 'search-results';
        searchResultsContainer.setAttribute('role', 'listbox');
        searchResultsContainer.setAttribute('aria-label', 'Search results');
        searchResultsContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 320px;
            max-height: 450px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 15px;
            overflow-y: auto;
            z-index: 1001;
            display: none;
            font-family: inherit;
        `;
        document.body.appendChild(searchResultsContainer);
    }

    function handleSearch() {
        const searchInput = document.querySelector('.search-input');
        if (!searchInput) return;
        
        const query = searchInput.value.trim().toLowerCase();
        
        clearHighlights();
        
        if (query.length === 0) {
            hideSearchResults();
            return;
        }
        
        if (query.length < 2) {
            return;
        }
        
        try {
            const externalFileResults = findInExternalFiles(query);
            
            const currentPageResults = searchContent(query);
            
            displaySearchResults(currentPageResults, externalFileResults, query);
            highlightContent(query);
        } catch (error) {
            console.error('Search error:', error);
            showErrorMessage('An error occurred while searching. Please try again.');
        }
    }

    function findInExternalFiles(query) {
        const externalResults = [];
        const queryWords = query.split(' ').filter(word => word.length > 1);
        
        Object.entries(fileContentMap).forEach(([keyword, fileInfo]) => {
            let matchScore = 0;
            
            if (keyword.toLowerCase() === query) {
                matchScore = 100;
            }
            else if (keyword.toLowerCase().includes(query)) {
                matchScore = 80;
            }
            else if (query.includes(keyword.toLowerCase())) {
                matchScore = 70;
            }
            else {
                queryWords.forEach(word => {
                    if (keyword.toLowerCase().includes(word)) {
                        matchScore += 20;
                    }
                });
            }
            
            if (matchScore > 0) {
                externalResults.push({
                    type: 'External File',
                    context: fileInfo.title,
                    snippet: `Information about "${keyword}" can be found in ${fileInfo.title}`,
                    file: fileInfo.file,
                    title: fileInfo.title,
                    isExternal: true,
                    matchScore: matchScore,
                    keyword: keyword
                });
            }
        });
        
        return externalResults
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 5);
    }

    function searchContent(query) {
        const results = [];
        
        try {
            const searchableElements = [
                ...document.querySelectorAll('.criteria-card'),
                ...document.querySelectorAll('.curriculum-card'),
                ...document.querySelectorAll('.program-title'),
                ...document.querySelectorAll('td, th'),
                ...document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li')
            ];

            searchableElements.forEach(element => {
                if (!element || !element.textContent) return;
                
                const text = element.textContent.toLowerCase();
                if (text.includes(query)) {
                    const context = getElementContext(element);
                    const snippet = getTextSnippet(text, query);
                    
                    let relevanceScore = 0;
                    if (text.indexOf(query) === 0) relevanceScore += 10; 
                    if (element.tagName.match(/^H[1-6]$/)) relevanceScore += 5; 
                    relevanceScore += (query.length / text.length) * 100;
                    
                    results.push({
                        element: element,
                        context: context,
                        snippet: snippet,
                        type: getElementType(element),
                        isExternal: false,
                        relevanceScore: relevanceScore
                    });
                }
            });

            return removeDuplicates(results)
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, 8);
        } catch (error) {
            console.error('Error in searchContent:', error);
            return [];
        }
    }

    function getElementContext(element) {
        try {
            let context = '';
            
            const containers = [
                '.program-section',
                '.criteria-card',
                '.curriculum-card',
                'section',
                '.card'
            ];
            
            for (const containerSelector of containers) {
                const container = element.closest(containerSelector);
                if (container) {
                    const titleSelectors = [
                        '.program-title',
                        '.card-title',
                        '.table-header h4',
                        'h1, h2, h3, h4, h5, h6'
                    ];
                    
                    for (const titleSelector of titleSelectors) {
                        const titleElement = container.querySelector(titleSelector);
                        if (titleElement && titleElement.textContent.trim()) {
                            context = titleElement.textContent.trim();
                            break;
                        }
                    }
                    
                    if (context) break;
                }
            }
            
            return context || 'General Information';
        } catch (error) {
            console.error('Error getting element context:', error);
            return 'General Information';
        }
    }

    function getTextSnippet(text, query) {
        try {
            const index = text.indexOf(query);
            if (index === -1) return text.substring(0, 60) + '...';
            
            const start = Math.max(0, index - 30);
            const end = Math.min(text.length, index + query.length + 30);
            
            let snippet = text.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < text.length) snippet = snippet + '...';
            
            return snippet;
        } catch (error) {
            console.error('Error getting text snippet:', error);
            return text.substring(0, 60) + '...';
        }
    }

    function getElementType(element) {
        if (!element) return 'Information';
        
        if (element.closest('.criteria-card')) return 'Admission Requirements';
        if (element.closest('.curriculum-card')) return 'Curriculum';
        if (element.classList.contains('program-title') || element.tagName.match(/^H[1-6]$/)) return 'Program';
        if (element.tagName === 'TD' || element.tagName === 'TH') return 'Course Details';
        return 'Information';
    }

    function removeDuplicates(results) {
        const seen = new Map();
        return results.filter(result => {
            const key = result.context + '|' + result.snippet.substring(0, 50);
            if (seen.has(key)) return false;
            seen.set(key, true);
            return true;
        });
    }

    function displaySearchResults(currentResults, externalResults, query) {
        if (!searchResultsContainer) return;
        
        const totalResults = currentResults.length + externalResults.length;
        
        if (totalResults === 0) {
            searchResultsContainer.innerHTML = `
                <div style="color: #666; text-align: center; padding: 20px;">
                    <strong>No results found for "${escapeHtml(query)}"</strong>
                    <p style="font-size: 0.9em; margin-top: 5px;">Try different keywords</p>
                </div>
            `;
        } else {
            let html = `
                <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                    <strong style="color: black;">Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${escapeHtml(query)}"</strong>
                </div>
            `;
            
            if (externalResults.length > 0) {
                html += `<div style="margin-bottom: 10px;"><strong style="color: maroon; font-size: 0.9em;">📁 Available in Other Sections:</strong></div>`;
                
                externalResults.forEach((result, index) => {
                    html += `
                        <div class="search-result-item external-result" 
                             data-file="${escapeHtml(result.file)}" 
                             data-title="${escapeHtml(result.title)}" 
                             role="option"
                             tabindex="0"
                             style="
                                padding: 10px;
                                margin-bottom: 8px;
                                border-radius: 6px;
                                cursor: pointer;
                                background: linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%);
                                transition: all 0.2s;
                                position: relative;
                             " 
                             onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)'" 
                             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
                            <div style="font-weight: bold; font-size: 0.85em; color: maroon; margin-bottom: 4px; display: flex; align-items: center;">
                                <span style="margin-right: 6px;">🔗</span>
                                ${result.type}
                            </div>
                            <div style="font-size: 0.9em; color: #555; margin-bottom: 4px; font-weight: 600;">
                                ${escapeHtml(result.context)}
                            </div>
                            <div style="font-size: 0.85em; color: #666;">
                                ${escapeHtml(result.snippet)}
                            </div>
                            <div style="position: absolute; top: 8px; right: 8px; font-size: 0.75em; color: maroon; font-weight: bold;">
                                Click to navigate →
                            </div>
                        </div>
                    `;
                });
            }
            
            if (currentResults.length > 0) {
                if (externalResults.length > 0) {
                    html += `<div style="margin: 15px 0 10px 0; padding-top: 10px; border-top: 1px solid #eee;"><strong style="color: maroon; font-size: 0.9em;">📄 On This Page:</strong></div>`;
                }
                
                currentResults.forEach((result, index) => {
                    const highlightedSnippet = result.snippet.replace(
                        new RegExp(escapeRegExp(query), 'gi'), 
                        `<mark style="background: #fff3cd; padding: 1px 3px;">${escapeHtml(query)}</mark>`
                    );
                    
                    html += `
                        <div class="search-result-item current-page-result" 
                             data-index="${index}" 
                             role="option"
                             tabindex="0"
                             style="
                                padding: 8px;
                                margin-bottom: 8px;
                                border-radius: 4px;
                                cursor: pointer;
                                background: #f8f9fa;
                                transition: background 0.2s;
                             " 
                             onmouseover="this.style.background='#e9ecef'" 
                             onmouseout="this.style.background='#f8f9fa'"
                             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
                            <div style="font-weight: bold; font-size: 0.85em; color: maroon; margin-bottom: 3px;">
                                ${escapeHtml(result.type)}
                            </div>
                            <div style="font-size: 0.8em; color: #666; margin-bottom: 3px;">
                                ${escapeHtml(result.context)}
                            </div>
                            <div style="font-size: 0.85em; color: #333;">
                                ${highlightedSnippet}
                            </div>
                        </div>
                    `;
                });
            }
            
            searchResultsContainer.innerHTML = html;
            
            searchResultsContainer.querySelectorAll('.external-result').forEach(item => {
                const clickHandler = () => {
                    const file = item.getAttribute('data-file');
                    const title = item.getAttribute('data-title');
                    redirectToFile(file, title, query);
                };
                
                item.addEventListener('click', clickHandler);
            });
            
            searchResultsContainer.querySelectorAll('.current-page-result').forEach((item, index) => {
                const clickHandler = () => {
                    if (currentResults[index]) {
                        scrollToResult(currentResults[index]);
                    }
                };
                
                item.addEventListener('click', clickHandler);
            });
        }
        
        searchResultsContainer.style.display = 'block';
    }

    function showErrorMessage(message) {
        if (!searchResultsContainer) return;
        
        searchResultsContainer.innerHTML = `
            <div style="color: #dc3545; text-align: center; padding: 20px;">
                <strong>⚠️ ${escapeHtml(message)}</strong>
            </div>
        `;
        searchResultsContainer.style.display = 'block';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

function redirectToFile(filename, title, searchQuery) {
    try {
       
        if (!filename || typeof filename !== 'string') {
            console.error('Invalid filename:', filename);
            return;
        }
        
        try {
            sessionStorage.setItem('searchQuery', searchQuery);
            sessionStorage.setItem('searchSource', 'admissions');
        } catch (storageError) {
            console.warn('Could not store search query in sessionStorage:', storageError);
        }
        
        window.location.href = filename;
    } catch (error) {
        console.error('Error redirecting to file:', error);
    }
}

    function checkForRedirectSearch() {
        try {
            const searchQuery = sessionStorage.getItem('searchQuery');
            const searchSource = sessionStorage.getItem('searchSource');
            
            if (searchQuery && searchSource) {
                sessionStorage.removeItem('searchQuery');
                sessionStorage.removeItem('searchSource');
                
                showRedirectNotification(searchQuery, searchSource);
                
                setTimeout(() => {
                    const searchInput = document.querySelector('.search-input');
                    if (searchInput) {
                        searchInput.value = searchQuery;
                        handleSearch();
                    }
                }, 1000);
            }
        } catch (error) {
            console.warn('Could not check for redirect search:', error);
        }
    }

    function showRedirectNotification(query, source) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: whitesmoke;
            color: black;
            padding: 15px 20px;
            border: 1px solid whitesmoke;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1002;
            max-width: 300px;
            font-family: inherit;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">Search Redirected</div>
            <div style="font-size: 0.9em;">You searched for "<strong>${escapeHtml(query)}</strong>" from ${escapeHtml(source)}. Here are the relevant results on this page.</div>
            <button onclick="this.parentElement.remove()" style="
                position: absolute;
                top: 5px;
                right: 8px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: black;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            " aria-label="Close notification">×</button>
        `;
        
        if (!document.getElementById('search-animations')) {
            const style = document.createElement('style');
            style.id = 'search-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 8000);
    }

    function scrollToResult(result) {
        if (!result || !result.element) return;
        
        try {
            
            clearHighlights();
            
            result.element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            
            const elementToHighlight = result.element.closest('.criteria-card, .curriculum-card, .program-section') || result.element;
            
            const originalStyles = {
                background: elementToHighlight.style.background,
                border: elementToHighlight.style.border,
                borderRadius: elementToHighlight.style.borderRadius,
                padding: elementToHighlight.style.padding,
                margin: elementToHighlight.style.margin,
                transition: elementToHighlight.style.transition
            };
            
            elementToHighlight.style.cssText += `
                background: #fff3cd !important;
                border-radius: 8px !important;
                padding: 10px !important;
                margin: 5px 0 !important;
                transition: all 0.3s ease !important;
            `;
            
            currentHighlights.push({
                element: elementToHighlight,
                originalStyles: originalStyles
            });

            setTimeout(() => {
                restoreElementStyles(elementToHighlight, originalStyles);
            }, 4000);
            
            hideSearchResults();
        } catch (error) {
            console.error('Error scrolling to result:', error);
        }
    }

    function restoreElementStyles(element, originalStyles) {
        if (!element) return;
        
        try {
            Object.keys(originalStyles).forEach(property => {
                element.style[property] = originalStyles[property] || '';
            });
        } catch (error) {
            console.error('Error restoring element styles:', error);
        }
    }

    function highlightContent(query) {
        if (!query || query.length < 2) return;
        
        try {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        if (node.parentElement.closest('#search-results, script, style')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        
                        if (node.parentElement.querySelector('.search-highlight')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        
                        return node.textContent.toLowerCase().includes(query) 
                            ? NodeFilter.FILTER_ACCEPT 
                            : NodeFilter.FILTER_REJECT;
                    }
                }
            );

            const textNodes = [];
            let node;
            let nodeCount = 0;
            const maxNodes = 100; 
            
            while ((node = walker.nextNode()) && nodeCount < maxNodes) {
                textNodes.push(node);
                nodeCount++;
            }

            textNodes.forEach(textNode => {
                const parent = textNode.parentElement;
                if (parent && !parent.closest('#search-results')) {
                    const text = textNode.textContent;
                    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
                    
                    if (regex.test(text)) {
                        const highlightedHTML = text.replace(regex, 
                            '<span class="search-highlight" style="background: blank; padding: 1px 2px; border-radius: 2px; font-weight: bold;">$1</span>'
                        );
                        
                        const wrapper = document.createElement('div');
                        wrapper.innerHTML = highlightedHTML;
                    
                        while (wrapper.firstChild) {
                            parent.insertBefore(wrapper.firstChild, textNode);
                        }
                        parent.removeChild(textNode);
                    }
                }
            });
        } catch (error) {
            console.error('Error highlighting content:', error);
        }
    }

    function clearHighlights() {
        try {
            document.querySelectorAll('.search-highlight').forEach(highlight => {
                const parent = highlight.parentNode;
                if (parent) {
                    parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
                    parent.normalize();
                }
            });
            
            currentHighlights.forEach(highlightData => {
                if (highlightData.element && highlightData.originalStyles) {
                    restoreElementStyles(highlightData.element, highlightData.originalStyles);
                }
            });
            currentHighlights = [];
        } catch (error) {
            console.error('Error clearing highlights:', error);
        }
    }

    function hideSearchResults() {
        if (searchResultsContainer) {
            searchResultsContainer.style.display = 'none';
        }
    }

    document.addEventListener('click', function(event) {
        try {
            const searchBar = document.getElementById('searchBar');
            const searchIcon = document.querySelector('.search-icon');
            
            if (searchResultsContainer && 
                !searchResultsContainer.contains(event.target) && 
                !searchBar?.contains(event.target) && 
                !searchIcon?.contains(event.target)) {
                hideSearchResults();
            }
        } catch (error) {
            console.error('Error handling outside click:', error);
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && searchResultsContainer && 
            searchResultsContainer.style.display === 'block') {
            hideSearchResults();
            clearHighlights();
        }
    });

    function initializeWhenReady() {
        try {
            initializeSearch();
            checkForRedirectSearch();
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeWhenReady);
    } else {
        initializeWhenReady();
    }

    window.toggleSearch = function() {
        try {
            const searchBar = document.getElementById('searchBar');
            if (!searchBar) {
                console.warn('Search bar not found');
                return;
            }
            
            const isVisible = searchBar.style.display === 'block';
            searchBar.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                }
            } else {
                hideSearchResults();
                clearHighlights();
            }
        } catch (error) {
            console.error('Error toggling search:', error);
        }
    };

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        window.PhilTechSearch = {
            clearHighlights,
            hideSearchResults,
            searchContent,
            findInExternalFiles
        };
    }

})();

function generateApplicationId() {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    return `PHIL-${year}-${randomNum}`;
}

function formatCampusName(campus) {
    const campusMap = {
        'gma': 'General Mariano Alvarez',
        'tanay': 'Tanay'
    };
    return campusMap[campus] || campus;
}

function formatApplicationType(type) {
    return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatGradeLevel(grade) {
    const gradeMap = {
        'grade11': 'Grade 11',
        'grade12': 'Grade 12',
        '1styear': '1st Year College',
        '2ndyear': '2nd Year College',
        '3rdyear': '3rd Year College',
        '4thyear': '4th Year College'
    };
    return gradeMap[grade] || grade;
}

function showReceipt(formData) {
    const overlay = document.getElementById('receiptOverlay');
    const currentDate = new Date();
    
    const applicationId = generateApplicationId();
    
    const dateOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    };
    
    const formattedDate = currentDate.toLocaleDateString('en-US', dateOptions);
    const formattedTime = currentDate.toLocaleTimeString('en-US', timeOptions);
    
    document.getElementById('applicationId').textContent = applicationId;
    document.getElementById('applicationDate').textContent = formattedDate;
    document.getElementById('applicationTime').textContent = formattedTime;
    document.getElementById('receiptName').textContent = formData.name;
    document.getElementById('receiptCampus').textContent = formatCampusName(formData.campus);
    document.getElementById('receiptType').textContent = formatApplicationType(formData.applicationType);
    document.getElementById('receiptGrade').textContent = formatGradeLevel(formData.gradeLevel);
    
    overlay.classList.add('active');
    
    document.body.style.overflow = 'hidden';
}

function closeReceipt() {
    const overlay = document.getElementById('receiptOverlay');
    overlay.classList.remove('active');
    
    document.body.style.overflow = '';
}

function printReceipt() {
    const printWindow = window.open('', '_blank');
    const receiptContent = document.querySelector('.receipt-container').innerHTML;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>PhilTech Application Receipt</title>
            <style>
                body { font-family: Georgia, serif; margin: 0; padding: 20px; }
                .receipt-container { background: white; }
                .receipt-header { background: #4e0404; color: white; padding: 1rem; display: flex; align-items: center; gap: 1rem; }
                .receipt-logo { width: 40px; height: 40px; border-radius: 50%; }
                .receipt-title h2 { margin: 0; font-size: 1.3rem; }
                .receipt-title p { margin: 0; font-size: 0.9rem; }
                .receipt-content { display: flex; min-height: 400px; }
                .receipt-left { flex: 2; padding: 1.5rem; border-right: 2px dashed #ddd; }
                .receipt-right { flex: 1; padding: 1.5rem; background: #f9f9f9; }
                .receipt-info h3 { color: #4e0404; margin-bottom: 1rem; }
                .detail-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee; }
                .detail-label { font-weight: bold; color: #555; }
                .detail-value { color: #333; }
                .status-pending { background: #fff3cd; color: #856404; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight: bold; }
                .applicant-info h4, .next-steps h4, .qr-section h4, .contact-info h4 { color: #4e0404; margin-bottom: 1rem; border-bottom: 1px solid #4e0404; padding-bottom: 0.5rem; }
                .next-steps ul { list-style: none; padding: 0; }
                .next-steps li { padding: 0.5rem 0; padding-left: 1.5rem; position: relative; }
                .next-steps li:before { content: "✓"; position: absolute; left: 0; color: #4e0404; font-weight: bold; }
                .qr-section { text-align: center; margin-bottom: 1rem; }
                .qr-code { background: white; padding: 10px; border-radius: 8px; display: inline-block; }
                .qr-description { font-size: 0.85rem; color: #666; }
                .contact-info p { margin: 0.3rem 0; font-size: 0.9rem; color: #555; }
                .receipt-close { display: none; }
            </style>
        </head>
        <body>
            ${receiptContent}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

function handleApplicationSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const applicationData = {
        name: formData.get('name'),
        address: formData.get('address'),
        sex: formData.get('sex'),
        birthday: formData.get('birthday'),
        birthplace: formData.get('birthplace'),
        nationality: formData.get('nationality'),
        religion: formData.get('religion'),
        contact: formData.get('contact'),
        campus: formData.get('campus'),
        applicationType: formData.get('applicationType'),
        gradeLevel: formData.get('gradeLevel')
    };
    
    const requiredFields = ['name', 'address', 'sex', 'birthday', 'birthplace', 'nationality', 'religion', 'contact', 'campus', 'applicationType', 'gradeLevel'];
    const missingFields = requiredFields.filter(field => !applicationData[field]);
    
    if (missingFields.length > 0) {
        alert('Please fill in all required fields.');
        return;
    }
    
    console.log('Application submitted:', applicationData);
    
    setTimeout(() => {
        showReceipt(applicationData);
    }, 500);
}

document.addEventListener('click', function(event) {
    const overlay = document.getElementById('receiptOverlay');
    if (event.target === overlay) {
        closeReceipt();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeReceipt();
    }
});

document.addEventListener('DOMContentLoaded', function() {
   
    if (!document.getElementById('receiptOverlay')) {
        console.warn('Receipt overlay not found. Make sure to add the HTML structure to your page.');
    }
});