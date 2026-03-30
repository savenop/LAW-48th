// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error('SW registration failed:', err));
    });
}

// Initialize Lenis for smooth scrolling
const lenis = new Lenis({
    wrapper: document.getElementById('scroll-container'),
    content: document.getElementById('scroll-container').firstElementChild,
    lerp: 0.1,
    smoothWheel: true
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// PDF.js Setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const url = '48.pdf'; // YOUR PDF FILE
let pdfDoc = null,
    pageNum = 1,
    pageIsRendering = false,
    pageNumIsPending = null,
    scale = 1.2; // Default Zoom

const canvas = document.getElementById('pdf-render');
const ctx = canvas.getContext('2d');

// LocalStorage Keys
const BOOKMARK_KEY = 'my_book_bookmark_48';
const THEME_KEY = 'my_book_theme';

// Load initial state
const savedPage = localStorage.getItem(BOOKMARK_KEY);
if (savedPage) pageNum = parseInt(savedPage, 10);

if (localStorage.getItem(THEME_KEY) === 'dark') {
    document.documentElement.classList.add('dark');
}

// Render the PDF page
const renderPage = num => {
    pageIsRendering = true;
    
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderCtx = { canvasContext: ctx, viewport };
        
        page.render(renderCtx).promise.then(() => {
            pageIsRendering = false;
            if (pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
            }
        });

        document.getElementById('page-num').textContent = num;
        updateBookmarkUI();
        lenis.scrollTo(0, { immediate: true }); // Reset scroll to top on page change
    });
};

const queueRenderPage = num => {
    if (pageIsRendering) {
        pageNumIsPending = num;
    } else {
        renderPage(num);
    }
};

// Pagination Logic
document.getElementById('prev-page').addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
});

document.getElementById('next-page').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
});

// Load the PDF
pdfjsLib.getDocument(url).promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
}).catch(err => {
    console.error('Error loading PDF:', err);
    alert('Could not load 48.pdf. Make sure it is in the same folder and you are running a local server.');
});

// Bookmark Logic
const bookmarkBtn = document.getElementById('bookmark-btn');
const bookmarkIcon = document.getElementById('bookmark-icon');

function updateBookmarkUI() {
    const saved = parseInt(localStorage.getItem(BOOKMARK_KEY));
    if (saved === pageNum) {
        bookmarkIcon.setAttribute('fill', 'currentColor');
    } else {
        bookmarkIcon.setAttribute('fill', 'none');
    }
}

bookmarkBtn.addEventListener('click', () => {
    const saved = parseInt(localStorage.getItem(BOOKMARK_KEY));
    if (saved === pageNum) {
        localStorage.removeItem(BOOKMARK_KEY); // Toggle off
    } else {
        localStorage.setItem(BOOKMARK_KEY, pageNum); // Toggle on
    }
    updateBookmarkUI();
});

// Settings Modal Logic
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const themeToggle = document.getElementById('theme-toggle');
const zoomSlider = document.getElementById('zoom-slider');

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    // small delay to allow display block to apply before animating opacity
    setTimeout(() => {
        settingsModal.classList.remove('opacity-0');
        settingsModal.querySelector('#settings-content').classList.remove('scale-95');
    }, 10);
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.add('opacity-0');
    settingsModal.querySelector('#settings-content').classList.add('scale-95');
    setTimeout(() => settingsModal.classList.add('hidden'), 300);
});

// Theme Toggle
themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem(THEME_KEY, 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem(THEME_KEY, 'dark');
    }
});

// Zoom Slider
zoomSlider.addEventListener('change', (e) => {
    scale = parseFloat(e.target.value);
    queueRenderPage(pageNum);
});