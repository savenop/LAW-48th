if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error('SW failed:', err));
    });
}

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const url = '/48.pdf'; 
let pdfDoc = null,
    pageNum = 1,
    pageIsRendering = false,
    pageNumIsPending = null;

const canvas = document.getElementById('pdf-render');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');

const BOOKMARK_KEY = 'my_book_bookmark_48';
const THEME_KEY = 'my_book_theme';

if (localStorage.getItem(BOOKMARK_KEY)) {
    pageNum = parseInt(localStorage.getItem(BOOKMARK_KEY), 10);
}
if (localStorage.getItem(THEME_KEY) === 'dark') {
    document.documentElement.classList.add('dark');
}

const renderPage = num => {
    pageIsRendering = true;
    
    pdfDoc.getPage(num).then(page => {
        // Auto-scale to fit mobile screen width (95% of screen to leave a tiny margin)
        const screenWidth = window.innerWidth * 0.95;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = screenWidth / unscaledViewport.width;
        
        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderCtx = { canvasContext: ctx, viewport };
        
        page.render(renderCtx).promise.then(() => {
            pageIsRendering = false;
            
            // Hide loader once the first page renders
            if (!loader.classList.contains('hidden')) {
                loader.classList.add('opacity-0');
                setTimeout(() => loader.classList.add('hidden'), 500);
            }

            if (pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
            }
        });

        document.getElementById('page-num').textContent = num;
        updateBookmarkUI();
        
        // Scroll back to top of the page when changing pages
        document.querySelector('main').scrollTop = 0;
    });
};

const queueRenderPage = num => {
    if (pageIsRendering) {
        pageNumIsPending = num;
    } else {
        renderPage(num);
    }
};

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

// PDF fetching config: disabled auto-fetch to handle large files better
const loadingTask = pdfjsLib.getDocument({
    url: url,
    disableAutoFetch: true,
    disableStream: false
});

loadingTask.promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
}).catch(err => {
    console.error('Error loading PDF:', err);
    loader.innerHTML = `<p class="text-red-500 font-bold px-4 text-center">Failed to load book. Please refresh.</p>`;
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
        localStorage.removeItem(BOOKMARK_KEY); 
    } else {
        localStorage.setItem(BOOKMARK_KEY, pageNum); 
    }
    updateBookmarkUI();
});

// Theme Toggle (Moved from modal to main nav for mobile simplicity)
document.getElementById('theme-toggle').addEventListener('click', () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem(THEME_KEY, 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem(THEME_KEY, 'dark');
    }
});

// Re-render PDF if screen rotates (portrait <-> landscape)
window.addEventListener('orientationchange', () => {
    setTimeout(() => queueRenderPage(pageNum), 200);
});