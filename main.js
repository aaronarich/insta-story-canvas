import { registerSW } from 'virtual:pwa-register'

// Canvas dimensions for Instagram Stories
const CANVAS_WIDTH = 2790;
const CANVAS_HEIGHT = 4960;

const canvas = document.getElementById('story-canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('image-upload');
const scaleDownBtn = document.getElementById('scale-down-btn');
const scaleUpBtn = document.getElementById('scale-up-btn');
const SCALE_STEP = 0.01;
const SCALE_MIN = 0.1;
const SCALE_MAX = 3;
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
let isLightLeakEnabled = false;
let appMode = 'story'; // 'story' | 'photo'

const leakToggleBtn = document.getElementById('leak-toggle-btn');
const grainToggleBtn = document.getElementById('grain-toggle-btn');
const prismToggleBtn = document.getElementById('prism-toggle-btn');
const randomPrismBtn = document.getElementById('random-prism-btn');
let isGrainEnabled = false;
let isPrismEnabled = false;

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

        // Apply Light Leak independently if enabled
        if (isLightLeakEnabled) {
            applyLightLeak();
        }

        // Apply Prism effect if enabled
        if (isPrismEnabled) {
            applyPrismEffect();
        }
    }
    ctx.restore();
}

function applyFilterBase(filter) {
    switch (filter) {
        case 'portra':
            ctx.filter = 'contrast(1.15) saturate(1.3) sepia(0.15) brightness(1.05)';
            break;
        case 'ektar':
            // High contrast, Punchy Red/Blue
            ctx.filter = 'contrast(1.25) saturate(1.4) brightness(1.02) sepia(0.05)';
            break;
        case 'velvia':
            // Deep blacks, very high saturation, slight magenta shift
            ctx.filter = 'contrast(1.3) saturate(1.8) brightness(0.95) hue-rotate(-5deg)';
            break;
        case 'pro400h':
            // Soft, very pastel, overexposed feel
            ctx.filter = 'brightness(1.2) contrast(0.9) saturate(1.05) sepia(0.1)';
            break;
        case 'cinestill':
            // Tungsten balanced, cool, halation (simulated via glow/blur in post)
            ctx.filter = 'contrast(1.1) saturate(1.2) hue-rotate(-10deg) brightness(1.05)';
            break;
        case 'polaroid':
            // Warm, faded blacks, slight green tint
            ctx.filter = 'contrast(0.9) brightness(1.1) saturate(0.8) sepia(0.25)';
            break;
        case 'expired':
            // More dramatic fade
            ctx.filter = 'contrast(0.85) brightness(1.2) sepia(0.5) saturate(0.7)';
            break;
        case 'bw-high':
            // Crushed blacks, high contrast B&W
            // Handled in post-process now for reliability
            ctx.filter = 'none';
            break;
        case 'ilford':
            // Ilford B&W - base filter applied, main processing in post
            ctx.filter = 'none';
            break;
        default:
            ctx.filter = 'none';
    }
}

function applyPostProcess(filter) {
    // Grain now applied conditionally based on toggle
    if (isGrainEnabled) {
        if (filter === 'ektar') applyGrain(0.22);
        else if (filter === 'velvia') applyGrain(0.15);
        else if (filter === 'pro400h') applyGrain(0.12); // Added manually here since overlay handles color
        else if (filter === 'cinestill') applyGrain(0.15);
        else if (filter === 'polaroid') applyGrain(0.2);
        else if (filter === 'expired') applyGrain(0.5);
        else if (filter === 'bw-high') applyGrain(0.4);
        else applyGrain(0.18); // Default grain for other filters (portra, ilford, none)
    }

    if (filter === 'pro400h') applyPro400HOverlayBase();
    else if (filter === 'cinestill') applyCinestillOverlayBase();
    else if (filter === 'polaroid') applyPolaroidOverlayBase();
    else if (filter === 'expired') applyExpiredOverlayBase();
    else if (filter === 'ilford') applyIlford();
    else if (filter === 'bw-high') applyBWHigh();
}

// Renamed to *Base to indicate they don't include grain anymore (grain handled in main loop)
function applyPro400HOverlayBase() {
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(0, 100, 100, 0.15)'; // Cyan tint
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lift blacks (lighten layer)
    ctx.globalCompositeOperation = 'lighten';
    ctx.fillStyle = 'rgba(0, 50, 70, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function applyCinestillOverlayBase() {
    // Halation simulation
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(0, 50, 255, 0.15)'; // Blueish cool tint
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Slight red lift
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(50, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function applyPolaroidOverlayBase() {
    // Warm vintage wash
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255, 150, 50, 0.2)'; // Orange/Warm
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(230, 230, 210, 0.2)'; // Creamy look
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Vignette
    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width / 3, canvas.width / 2, canvas.height / 2, canvas.width);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(50,40,30,0.5)');

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function applyExpiredOverlayBase() {
    // Color shifting
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 0, 100, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(120, 120, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Vignette
    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width / 3, canvas.width / 2, canvas.height / 2, canvas.width);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function applyIlford() {
    // Classic Ilford B&W film look
    const w = canvas.width;
    const h = canvas.height;

    const idata = ctx.getImageData(0, 0, w, h);
    const data = idata.data;

    for (let i = 0; i < data.length; i += 4) {
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrasted = Math.pow(brightness / 255, 0.9) * 255;
        const final = Math.min(255, Math.max(0, contrasted * 1.15));
        data[i] = final;
        data[i + 1] = final;
        data[i + 2] = final;
    }
    ctx.putImageData(idata, 0, 0);

    ctx.putImageData(idata, 0, 0);

    // Grain handled by toggle+postProcess
}

function applyBWHigh() {
    // High Contrast B&W Manual Implementation
    const w = canvas.width;
    const h = canvas.height;

    const idata = ctx.getImageData(0, 0, w, h);
    const data = idata.data;

    // Contrast factor calculation: formula (259 * (contrast + 255)) / (255 * (259 - contrast))
    // We want high contrast. simple linear multiplier centered on 128 is easier.
    // Let's use a simple contrast stretch. 

    for (let i = 0; i < data.length; i += 4) {
        // 1. Grayscale (Luma)
        let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // 2. High Contrast
        // (val - 128) * factor + 128
        // factor 1.5
        gray = (gray - 128) * 1.5 + 128;

        // 3. Brightness bump
        gray = gray * 1.05;

        // Clamp
        gray = Math.min(255, Math.max(0, gray));

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
    ctx.putImageData(idata, 0, 0);
}

// Reduced default grain as requested
function applyGrain(strength = 0.18) {
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

    // Check if current filter is B&W
    const isBW = currentFilter === 'ilford' || currentFilter === 'bw-high';

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

        if (isBW) {
            // Grayscale light leaks for B&W filters
            const lightness = 70 + random() * 20; // 70-90% lightness
            gradient.addColorStop(0, `hsla(0, 0%, ${lightness}%, 0.6)`);
            gradient.addColorStop(1, `hsla(0, 0%, ${lightness - 20}%, 0)`);
        } else {
            // Warm colors: Orange, Red, Pink
            const hue = 10 + random() * 40; // 10-50 (Red-Orange-Yellow)
            gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.6)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }

    ctx.globalCompositeOperation = 'source-over';
}

function applyPrismEffect() {
    const w = canvas.width;
    const h = canvas.height;

    // Seeded random
    let seed = (window.prismSeed || 0.45) * 2147483647;
    const random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    if (!window.prismSeed) {
        window.prismSeed = Math.random();
    }

    ctx.save();

    // We want a very soft, dreamy look.
    // Instead of sharp shapes, we'll use large, diffuse gradients.

    // Check if current filter is B&W
    const isBW = currentFilter === 'ilford' || currentFilter === 'bw-high';

    const numFlares = 2 + Math.floor(random() * 2); // 2-3 large flares

    for (let i = 0; i < numFlares; i++) {
        // Position flares mostly at the edges/corners
        const isLeft = random() > 0.5;
        const x = isLeft ? w * (random() * 0.3) : w * (0.7 + random() * 0.3);
        const y = h * (0.1 + random() * 0.8);

        // Large radius for softness
        const r = Math.max(w, h) * (0.4 + random() * 0.4);

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);

        if (isBW) {
            // Grayscale Light Leaks
            const intensity = 0.2 + random() * 0.15;
            grad.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
            grad.addColorStop(0.5, `rgba(200, 200, 200, ${intensity * 0.5})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
            // Pick a color palette based on reference images:
            // Option A: Warm Amber/Gold (common in vintage prism shots)
            // Option B: Cool Cyan/White (common in modern prism shots)
            // Option C: Mixed

            const palette = random();
            if (palette < 0.4) {
                // Warm Amber
                grad.addColorStop(0, 'rgba(255, 200, 150, 0.4)'); // Bright warm center
                grad.addColorStop(0.4, 'rgba(255, 100, 50, 0.2)'); // Red-orange mid
                grad.addColorStop(0.7, 'rgba(100, 50, 0, 0.1)'); // Fading fast
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else if (palette < 0.7) {
                // Cool Ethereal
                grad.addColorStop(0, 'rgba(200, 240, 255, 0.3)'); // White-blue center
                grad.addColorStop(0.4, 'rgba(100, 180, 255, 0.15)'); // Cyan mid
                grad.addColorStop(0.8, 'rgba(0, 50, 100, 0)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else {
                // Spectral/Rainbow (subtle)
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
                grad.addColorStop(0.2, 'rgba(255, 255, 0, 0.15)'); // Yellow
                grad.addColorStop(0.4, 'rgba(255, 0, 0, 0.1)');   // Red
                grad.addColorStop(0.6, 'rgba(0, 0, 255, 0.1)');   // Blue
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            }
        }

        // Use 'screen' or 'Overlay' for that light-leak feel
        // Screen is safer for ensuring it looks like added light without darkening
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = grad;

        // Save/Restore for transform
        ctx.save();

        // Squash the gradient slightly to make it look more like a flare streak?
        // Or keep it round for soft bokeh. Let's try slight squashing.
        ctx.translate(x, y);
        ctx.scale(1 + random() * 0.5, 1); // Random horizontal stretch
        ctx.rotate(random() * Math.PI * 2);
        ctx.translate(-x, -y);

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Add a "Bokeh Field" - large, very faint circles for texture without lines
    const numBokeh = 3 + Math.floor(random() * 5);

    for (let i = 0; i < numBokeh; i++) {
        const bx = random() * w;
        const by = random() * h;
        const br = w * (0.1 + random() * 0.2); // Medium sized soft circles

        const bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        bGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        bGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
}

// function applyDither() REMOVED

// Event Listeners
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Reset value so the change event triggers even if the same file is selected again
        e.target.value = '';

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                console.log('Image loaded:', img.width, img.height, 'Mode:', appMode);

                // Reset scale to fit width initially if too large (only in Story mode)
                if (appMode === 'story' && img.width > canvas.width) {
                    scale = canvas.width / img.width;
                }
                scaleValue.textContent = `${scale.toFixed(2)}x`;
                draw();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});



scaleDownBtn.addEventListener('click', () => {
    scale = Math.max(SCALE_MIN, scale - SCALE_STEP);
    scaleValue.textContent = `${scale.toFixed(2)}x`;
    draw();
});

scaleUpBtn.addEventListener('click', () => {
    scale = Math.min(SCALE_MAX, scale + SCALE_STEP);
    scaleValue.textContent = `${scale.toFixed(2)}x`;
    draw();
});

filterSelect.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    draw();
});

leakToggleBtn.addEventListener('click', () => {
    isLightLeakEnabled = !isLightLeakEnabled;

    if (isLightLeakEnabled) {
        leakToggleBtn.classList.add('active-toggle');
        randomLeakBtn.classList.remove('hidden');
    } else {
        leakToggleBtn.classList.remove('active-toggle');
        randomLeakBtn.classList.add('hidden');
    }
    draw();
});

grainToggleBtn.addEventListener('click', () => {
    isGrainEnabled = !isGrainEnabled;

    if (isGrainEnabled) {
        grainToggleBtn.classList.add('active-toggle');
    } else {
        grainToggleBtn.classList.remove('active-toggle');
    }
    draw();
});

prismToggleBtn.addEventListener('click', () => {
    isPrismEnabled = !isPrismEnabled;

    if (isPrismEnabled) {
        prismToggleBtn.classList.add('active-toggle');
        randomPrismBtn.classList.remove('hidden');
    } else {
        prismToggleBtn.classList.remove('active-toggle');
        randomPrismBtn.classList.add('hidden');
    }
    draw();
});

randomLeakBtn.addEventListener('click', () => {
    leakSeed = Math.random();
    draw();
});

randomPrismBtn.addEventListener('click', () => {
    window.prismSeed = Math.random();
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

// Attach tab event listeners
// (Module scripts are deferred, so DOM is ready by the time this runs)
const storyControls = document.getElementById('story-controls');
const tabBtns = document.querySelectorAll('.tab-btn');

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
