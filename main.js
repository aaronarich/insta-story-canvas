// Canvas dimensions for Instagram Stories
const CANVAS_WIDTH = 2790;
const CANVAS_HEIGHT = 4960;

const canvas = document.getElementById('story-canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('image-upload');
const scaleSlider = document.getElementById('scale-slider');
const colorPicker = document.getElementById('bg-color');
const saveBtn = document.getElementById('save-btn');
const favBtn = document.getElementById('fav-btn');
const scaleValue = document.getElementById('scale-value');
const filterSelect = document.getElementById('filter-select');
const randomLeakBtn = document.getElementById('random-leak-btn');

// State
let currentImage = null;
let scale = 1;
let backgroundColor = '#ffffff';
let currentFilter = 'none';
let leakSeed = Math.random();
let appMode = 'story'; // 'story' | 'photo'

const storyControls = document.getElementById('story-controls');
const tabBtns = document.querySelectorAll('.tab-btn');

// Initialize canvas
function initCanvas() {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    draw();
}

// Draw everything
function draw() {
    if (appMode === 'story') {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        // Clear and fill background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        // Photo Mode: fit canvas to image
        if (currentImage) {
            canvas.width = currentImage.width;
            canvas.height = currentImage.height;
        } else {
            // Default placeholder
            canvas.width = 1080;
            canvas.height = 1080;
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#333';
            ctx.font = '40px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Select an image', canvas.width / 2, canvas.height / 2);
            return;
        }
    }

    // Save context for filters
    ctx.save();

    if (currentImage) {
        let x = 0, y = 0, imgWidth = 0, imgHeight = 0;

        if (appMode === 'story') {
            imgWidth = currentImage.width * scale;
            imgHeight = currentImage.height * scale;
            x = (canvas.width - imgWidth) / 2;
            y = (canvas.height - imgHeight) / 2;
        } else {
            imgWidth = canvas.width;
            imgHeight = canvas.height;
            x = 0;
            y = 0;
        }

        // Apply Filters
        applyFilterBase(currentFilter);

        ctx.drawImage(currentImage, x, y, imgWidth, imgHeight);

        // Post-processing effects (Grain, Leaks, Dither)
        ctx.filter = 'none'; // Reset filter for overlays

        applyPostProcess(currentFilter);
    }
    ctx.restore();
}

function applyFilterBase(filter) {
    switch (filter) {
        case 'portra':
            ctx.filter = 'contrast(1.1) saturate(1.2) sepia(0.1) brightness(1.05)';
            break;
        case 'ektar':
            ctx.filter = 'contrast(1.15) saturate(1.4) brightness(1.0)';
            break;
        case 'velvia':
            ctx.filter = 'contrast(1.2) saturate(1.6) sepia(0.1) hue-rotate(-10deg)';
            break;
        case 'pro400h':
            ctx.filter = 'brightness(1.1) contrast(0.95) saturate(1.1) sepia(0.2)';
            break;
        case 'expired':
            ctx.filter = 'contrast(0.9) brightness(1.1) sepia(0.4) saturate(0.8)';
            break;
        default:
            ctx.filter = 'none';
    }
}

function applyPostProcess(filter) {
    if (filter === 'portra') applyGrain();
    else if (filter === 'ilford') applyIlford();
    else if (filter === 'leak') applyLightLeak();
    else if (filter === 'dither') applyDither();
    else if (filter === 'ektar') applyGrain(); // Subtle grain
    else if (filter === 'velvia') { /* Cleaner look, minimal grain */ }
    else if (filter === 'pro400h') applyPro400HOverlay();
    else if (filter === 'expired') applyExpiredOverlay();
}

function applyPro400HOverlay() {
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(0, 50, 50, 0.1)'; // Cool cyan tint
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Minimal Grain
    applyGrain(0.05);
}

function applyExpiredOverlay() {
    // Color shifting
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 0, 100, 0.05)'; // Magenta lift
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(100, 100, 0, 0.1)'; // Green shadows
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Heavy Grain
    applyGrain(0.25);
    // Random scratches/dust could be added here
}

function applyIlford() {
    // Classic Ilford B&W film look
    // High contrast grayscale with slight grain
    const w = canvas.width;
    const h = canvas.height;

    // Get image data for grayscale conversion
    const idata = ctx.getImageData(0, 0, w, h);
    const data = idata.data;

    // Convert to grayscale with contrast boost
    for (let i = 0; i < data.length; i += 4) {
        // Weighted grayscale conversion
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Apply contrast curve (S-curve)
        // Map 0-255 to a higher contrast range
        const contrasted = Math.pow(brightness / 255, 0.9) * 255;
        const final = Math.min(255, Math.max(0, contrasted * 1.15));

        data[i] = final;
        data[i + 1] = final;
        data[i + 2] = final;
    }

    ctx.putImageData(idata, 0, 0);

    // Add subtle grain (less than Portra)
    if (!window.noisePattern) {
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = 512;
        noiseCanvas.height = 512;
        const nCtx = noiseCanvas.getContext('2d');
        const noiseData = nCtx.createImageData(512, 512);
        const buffer32 = new Uint32Array(noiseData.data.buffer);
        for (let i = 0; i < buffer32.length; i++) {
            if (Math.random() < 0.5) {
                buffer32[i] = 0xff000000;
            } else {
                buffer32[i] = 0xffffffff;
            }
        }
        nCtx.putImageData(noiseData, 0, 0);
        window.noisePattern = ctx.createPattern(noiseCanvas, 'repeat');
    }

    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.08; // Subtle grain
    ctx.fillStyle = window.noisePattern;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
}

function applyGrain(strength = 0.15) {
    const w = canvas.width;
    const h = canvas.height;

    // Create a noise pattern
    // Optimization: Create small noise canvas and repeat it?
    // For now, let's just draw random noise on top with low opacity
    // Drawing per-pixel noise on 4k canvas is slow in JS loop.
    // Better to use a small pattern and scale it up or repeat.

    // Let's use a composite operation with a pre-generated noise pattern if possible.
    // Or just simple random rects? No, that's ugly.
    // Let's try a simple loop for now, but maybe on a smaller offscreen canvas then scaled up?
    // Actually, `ctx.filter` has no noise.

    // Fast noise: Fill with random grey, set blend mode to overlay
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(128, 128, 128, 0.2)'; // Base overlay

    // We can't easily generate per-pixel noise fast without WebGL.
    // Alternative: Use a data URL of a noise image?
    // Or generate it once on an offscreen canvas.

    if (!window.noisePattern) {
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = 512;
        noiseCanvas.height = 512;
        const nCtx = noiseCanvas.getContext('2d');
        const idata = nCtx.createImageData(512, 512);
        const buffer32 = new Uint32Array(idata.data.buffer);
        for (let i = 0; i < buffer32.length; i++) {
            if (Math.random() < 0.5) {
                buffer32[i] = 0xff000000; // Black
            } else {
                buffer32[i] = 0xffffffff; // White
            }
        }
        nCtx.putImageData(idata, 0, 0);
        window.noisePattern = ctx.createPattern(noiseCanvas, 'repeat');
    }

    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = strength;
    ctx.fillStyle = window.noisePattern;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
}

function applyLightLeak() {
    const w = canvas.width;
    const h = canvas.height;

    // Seeded random (simple LCG)
    let seed = leakSeed * 2147483647;
    const random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    ctx.globalCompositeOperation = 'screen';

    // Create 2-3 random leaks
    const numLeaks = 2 + Math.floor(random() * 2);

    for (let i = 0; i < numLeaks; i++) {
        const x = random() * w;
        const y = random() * h;
        const r = (w + h) / 3 * (0.5 + random());

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        // Warm colors: Orange, Red, Pink
        const hue = 10 + random() * 40; // 10-50 (Red-Orange-Yellow)
        gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.6)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }

    ctx.globalCompositeOperation = 'source-over';
}

function applyDither() {
    // Game Boy Camera effect
    // 4-level grayscale (2-bit) with ordered dithering
    const w = canvas.width;
    const h = canvas.height;

    // Get image data
    const idata = ctx.getImageData(0, 0, w, h);
    const data = idata.data;

    // Game Boy Camera palette (4 shades)
    const palette = [
        0,      // Black
        85,     // Dark gray (33%)
        170,    // Light gray (66%)
        255     // White
    ];

    // 4x4 Bayer matrix for ordered dithering
    const bayerMatrix = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ];

    // Normalize Bayer matrix to 0-1 range
    const bayerSize = 4;
    const bayerScale = 16; // 4x4 = 16 levels

    // Convert to grayscale and apply ordered dithering
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;

            // Convert to grayscale
            const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

            // Get Bayer threshold
            const bayerX = x % bayerSize;
            const bayerY = y % bayerSize;
            const threshold = (bayerMatrix[bayerY][bayerX] / bayerScale) - 0.5;

            // Add dithering noise and quantize to 4 levels
            const dithered = brightness + (threshold * 64); // Adjust dither strength

            // Quantize to nearest palette color
            let nearestColor = palette[0];
            let minDist = Math.abs(dithered - palette[0]);

            for (let p = 1; p < palette.length; p++) {
                const dist = Math.abs(dithered - palette[p]);
                if (dist < minDist) {
                    minDist = dist;
                    nearestColor = palette[p];
                }
            }

            data[i] = nearestColor;
            data[i + 1] = nearestColor;
            data[i + 2] = nearestColor;
        }
    }

    ctx.putImageData(idata, 0, 0);
}

// Event Listeners
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                // Reset scale to fit width initially if too large
                if (appMode === 'story' && img.width > canvas.width) {
                    scale = canvas.width / img.width;
                    scaleSlider.value = scale;
                }
                scaleValue.textContent = `${scale.toFixed(2)}x`;
                draw();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});



scaleSlider.addEventListener('input', (e) => {
    scale = parseFloat(e.target.value);
    scaleValue.textContent = `${scale.toFixed(2)}x`;
    draw();
});

filterSelect.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    if (currentFilter === 'leak') {
        randomLeakBtn.classList.remove('hidden');
    } else {
        randomLeakBtn.classList.add('hidden');
    }
    draw();
});

randomLeakBtn.addEventListener('click', () => {
    leakSeed = Math.random();
    draw();
});

colorPicker.addEventListener('input', (e) => {
    backgroundColor = e.target.value;
    draw();
});

const modal = document.getElementById('save-modal');
const modalImg = document.getElementById('save-img');
const closeModal = document.getElementById('close-modal');

closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
});

saveBtn.addEventListener('click', () => {
    try {
        canvas.toBlob(async (blob) => {
            if (!blob) {
                alert('Failed to generate image.');
                return;
            }

            const file = new File([blob], `insta-story-${Date.now()}.jpg`, { type: 'image/jpeg' });

            // Try Web Share API first (Mobile)
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'InstaCanvas Story',
                        text: 'Here is my new story canvas!'
                    });
                    return; // Share successful
                } catch (shareError) {
                    console.log('Share failed or cancelled, falling back to download/modal', shareError);
                }
            }

            // Fallback: Download (Desktop) or Modal (Mobile fallback)
            // We'll use the modal if we suspect we are on mobile (touch events) or just always use modal for consistency?
            // Actually, for desktop, direct download is better.
            // Let's try to detect if we are on a "mobile-ish" device or just default to download, 
            // but since the user had issues, let's show the modal if share fails?
            // Or better: Try download, if it's likely to fail (iOS), show modal?
            // iOS Safari doesn't support 'download' attribute well.

            // Let's do this:
            // 1. Create URL
            const url = URL.createObjectURL(blob);

            // 2. If it's a desktop browser (heuristic), try download
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (!isMobile) {
                const link = document.createElement('a');
                link.download = file.name;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // We can revoke later
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
                // 3. On mobile, show the modal
                modalImg.src = url;
                modal.classList.add('active');
            }

        }, 'image/jpeg', 0.95);
    } catch (error) {
        console.error('Error saving image:', error);
        alert('Failed to save image.');
    }
});

let longPressTimer;
let isLongPress = false;

function saveFavorite() {
    localStorage.setItem('favScale', scale);
    alert(`Saved ${scale.toFixed(2)}x as favorite size!`);
    updateFavButtonTitle();
}

function loadFavorite() {
    const savedScale = localStorage.getItem('favScale');
    if (savedScale) {
        scale = parseFloat(savedScale);
        scaleSlider.value = scale;
        scaleValue.textContent = `${scale.toFixed(2)}x`;
        draw();
        // Optional: Visual feedback
    } else {
        // If no favorite, save current
        saveFavorite();
    }
}

function updateFavButtonTitle() {
    const savedScale = localStorage.getItem('favScale');
    if (savedScale) {
        favBtn.title = `Tap to load ${parseFloat(savedScale).toFixed(2)}x, Hold to save current`;
    } else {
        favBtn.title = "Tap to save current size as favorite";
    }
}

// Initialize title
updateFavButtonTitle();

favBtn.addEventListener('mousedown', () => {
    isLongPress = false;
    longPressTimer = setTimeout(() => {
        isLongPress = true;
        saveFavorite();
    }, 600);
});

favBtn.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent ghost clicks
    isLongPress = false;
    longPressTimer = setTimeout(() => {
        isLongPress = true;
        saveFavorite();
    }, 600);
});

favBtn.addEventListener('mouseup', () => {
    clearTimeout(longPressTimer);
});

favBtn.addEventListener('mouseleave', () => {
    clearTimeout(longPressTimer);
});

favBtn.addEventListener('touchend', () => {
    clearTimeout(longPressTimer);
    if (!isLongPress) {
        loadFavorite();
    }
});

favBtn.addEventListener('click', (e) => {
    if (isLongPress) return;
    // For mouse clicks (touchstart prevents mouse click usually, but explicit click needs handling)
    // We handled touch in touchend.
    // For mouse, click fires after mouseup.
    loadFavorite();
});

// Initial draw
initCanvas();

// Register Service Worker
import { registerSW } from 'virtual:pwa-register'

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Toggle active class
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Set mode
        appMode = btn.dataset.mode;

        // Show/Hide controls
        if (appMode === 'story') {
            storyControls.classList.remove('hidden');
        } else {
            storyControls.classList.add('hidden');
        }

        // Redraw
        draw();
    });
});

const updateSW = registerSW({
    onNeedRefresh() {
        if (confirm('New content available. Reload?')) {
            updateSW(true)
        }
    },
})
