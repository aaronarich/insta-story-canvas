import { registerSW } from 'virtual:pwa-register'

// Canvas dimensions for Instagram Stories
const CANVAS_WIDTH = 2790;
const CANVAS_HEIGHT = 4960;

const canvas = document.getElementById('story-canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('image-upload');
const scaleDownBtn = document.getElementById('scale-down-btn');
const scaleUpBtn = document.getElementById('scale-up-btn');
const SCALE_STEP = 0.05;
const SCALE_MIN = 0.1;
const SCALE_MAX = 1.0;
const colorPicker = document.getElementById('bg-color');
const saveBtn = document.getElementById('save-btn');
const favBtn = document.getElementById('fav-btn');
const scaleValue = document.getElementById('scale-value');
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

// Filter definitions
const FILTERS = [
    { id: 'none',      name: 'Normal' },
    { id: 'portra',    name: 'Portra 400' },
    { id: 'ektar',     name: 'Ektar 100' },
    { id: 'velvia',    name: 'Velvia 50' },
    { id: 'pro400h',   name: 'Pro 400H' },
    { id: 'cinestill', name: 'Cinestill' },
    { id: 'polaroid',  name: 'Polaroid' },
    { id: 'expired',   name: 'Expired' },
    { id: 'ilford',    name: 'Ilford B&W' },
    { id: 'bw-high',   name: 'Hi-Con B&W' },
];

// Toast notification helper
const toastEl = document.getElementById('toast');
let toastTimer = null;
function showToast(message, duration = 2500) {
    toastEl.textContent = message;
    toastEl.className = 'toast toast-visible';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastEl.classList.remove('toast-visible');
    }, duration);
}

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
            // Empty state
            canvas.width = 1080;
            canvas.height = 1080;
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.arc(540, 430, 110, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Tap \uD83D\uDDBC\uFE0F to add a photo', 540, 620);
            return;
        }
    }

    // Save context for filters
    ctx.save();

    if (currentImage) {
        let x = 0, y = 0, imgWidth = 0, imgHeight = 0;

        if (appMode === 'story') {
            const fitScale = Math.min(CANVAS_WIDTH / currentImage.width, CANVAS_HEIGHT / currentImage.height);
            imgWidth = currentImage.width * fitScale * scale;
            imgHeight = currentImage.height * fitScale * scale;
            x = (canvas.width - imgWidth) / 2;
            y = (canvas.height - imgHeight) / 2;
        } else {
            imgWidth = canvas.width;
            imgHeight = canvas.height;
            x = 0;
            y = 0;
        }

        // Clip all effects to the image region
        ctx.beginPath();
        ctx.rect(x, y, imgWidth, imgHeight);
        ctx.clip();

        // Apply Filters
        applyFilterBase(currentFilter);

        ctx.drawImage(currentImage, x, y, imgWidth, imgHeight);

        // Post-processing effects
        ctx.filter = 'none'; // Reset filter for overlays

        applyPostProcess(currentFilter, x, y, imgWidth, imgHeight);

        if (isLightLeakEnabled) {
            applyLightLeak();
        }

        if (isPrismEnabled) {
            applyPrismEffect();
        }
    }
    ctx.restore();
}

function applyFilterBase(filter) {
    switch (filter) {
        case 'portra':
            // Kodak Portra 400 — warm amber cast, lifted shadows, moderate saturation
            ctx.filter = 'brightness(1.1) contrast(1.08) saturate(1.3) sepia(0.22)';
            break;
        case 'ektar':
            // Kodak Ektar 100 — punchy, vivid, high saturation, strong reds
            ctx.filter = 'contrast(1.35) saturate(1.7) brightness(1.0) hue-rotate(-8deg)';
            break;
        case 'velvia':
            // Fuji Velvia 50 — extreme saturation, deep contrast, vivid cool greens
            ctx.filter = 'contrast(1.5) saturate(2.2) brightness(0.88) hue-rotate(-14deg)';
            break;
        case 'pro400h':
            // Overexposed pastel feel — lifted brightness, slightly desaturated contrast
            ctx.filter = 'brightness(1.25) contrast(0.88) saturate(1.1) sepia(0.12)';
            break;
        case 'cinestill':
            // Tungsten-balanced — stronger hue shift to make the blue cast actually register
            ctx.filter = 'contrast(1.1) saturate(1.2) hue-rotate(-20deg) brightness(1.05)';
            break;
        case 'polaroid':
            ctx.filter = 'contrast(0.9) brightness(1.1) saturate(0.8) sepia(0.25)';
            break;
        case 'expired':
            ctx.filter = 'contrast(0.85) brightness(1.2) sepia(0.5) saturate(0.7)';
            break;
        case 'bw-high':
            ctx.filter = 'none';
            break;
        case 'ilford':
            ctx.filter = 'none';
            break;
        default:
            ctx.filter = 'none';
    }
}

function applyPostProcess(filter, imgX, imgY, imgW, imgH) {
    if (isGrainEnabled) {
        if (filter === 'ektar') applyGrain(0.22);
        else if (filter === 'velvia') applyGrain(0.15);
        else if (filter === 'pro400h') applyGrain(0.12);
        else if (filter === 'cinestill') applyGrain(0.15);
        else if (filter === 'polaroid') applyGrain(0.2);
        else if (filter === 'expired') applyGrain(0.5);
        else if (filter === 'bw-high') applyGrain(0.4);
        else applyGrain(0.18);
    }

    if (filter === 'pro400h') applyPro400HOverlayBase();
    else if (filter === 'cinestill') applyCinestillOverlayBase();
    else if (filter === 'polaroid') applyPolaroidOverlayBase();
    else if (filter === 'expired') applyExpiredOverlayBase();
    else if (filter === 'ilford') applyIlford(imgX, imgY, imgW, imgH);
    else if (filter === 'bw-high') applyBWHigh(imgX, imgY, imgW, imgH);
}

function applyPro400HOverlayBase() {
    // Lifted pastel teal/cyan — opacity raised from 0.15 to 0.25 so it actually reads
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(0, 120, 140, 0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'lighten';
    ctx.fillStyle = 'rgba(0, 60, 80, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'source-over';
}

function applyCinestillOverlayBase() {
    // Blue cast raised to 0.30 so the tungsten look is visible; halation red lift added
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(0, 50, 255, 0.30)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(80, 0, 0, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'source-over';
}

function applyPolaroidOverlayBase() {
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255, 150, 50, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(230, 230, 210, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width / 3, canvas.width / 2, canvas.height / 2, canvas.width);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(50,40,30,0.5)');

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function applyExpiredOverlayBase() {
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 0, 100, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(120, 120, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width / 3, canvas.width / 2, canvas.height / 2, canvas.width);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function applyIlford(imgX, imgY, imgW, imgH) {
    const idata = ctx.getImageData(imgX, imgY, imgW, imgH);
    const data = idata.data;

    for (let i = 0; i < data.length; i += 4) {
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrasted = Math.pow(brightness / 255, 0.9) * 255;
        const final = Math.min(255, Math.max(0, contrasted * 1.15));
        data[i] = final;
        data[i + 1] = final;
        data[i + 2] = final;
    }
    ctx.putImageData(idata, imgX, imgY);
}

function applyBWHigh(imgX, imgY, imgW, imgH) {
    const idata = ctx.getImageData(imgX, imgY, imgW, imgH);
    const data = idata.data;

    for (let i = 0; i < data.length; i += 4) {
        let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        gray = (gray - 128) * 1.5 + 128;
        gray = gray * 1.05;
        gray = Math.min(255, Math.max(0, gray));
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
    ctx.putImageData(idata, imgX, imgY);
}

function applyGrain(strength = 0.18) {
    const w = canvas.width;
    const h = canvas.height;

    if (!window.noisePattern) {
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = 512;
        noiseCanvas.height = 512;
        const nCtx = noiseCanvas.getContext('2d');
        const idata = nCtx.createImageData(512, 512);
        const buffer32 = new Uint32Array(idata.data.buffer);
        for (let i = 0; i < buffer32.length; i++) {
            buffer32[i] = Math.random() < 0.5 ? 0xff000000 : 0xffffffff;
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

    const isBW = currentFilter === 'ilford' || currentFilter === 'bw-high';

    let seed = leakSeed * 2147483647;
    const random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    ctx.globalCompositeOperation = 'screen';

    const numLeaks = 2 + Math.floor(random() * 2);

    for (let i = 0; i < numLeaks; i++) {
        const x = random() * w;
        const y = random() * h;
        const r = (w + h) / 3 * (0.5 + random());

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);

        if (isBW) {
            const lightness = 70 + random() * 20;
            gradient.addColorStop(0, `hsla(0, 0%, ${lightness}%, 0.6)`);
            gradient.addColorStop(1, `hsla(0, 0%, ${lightness - 20}%, 0)`);
        } else {
            const hue = 10 + random() * 40;
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

    if (!window.prismSeed) {
        window.prismSeed = Math.random();
    }
    let seed = window.prismSeed * 2147483647;
    const random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    ctx.save();

    const isBW = currentFilter === 'ilford' || currentFilter === 'bw-high';

    const numFlares = 2 + Math.floor(random() * 2);

    for (let i = 0; i < numFlares; i++) {
        const isLeft = random() > 0.5;
        const x = isLeft ? w * (random() * 0.3) : w * (0.7 + random() * 0.3);
        const y = h * (0.1 + random() * 0.8);
        const r = Math.max(w, h) * (0.4 + random() * 0.4);

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);

        if (isBW) {
            const intensity = 0.2 + random() * 0.15;
            grad.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
            grad.addColorStop(0.5, `rgba(200, 200, 200, ${intensity * 0.5})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
            const palette = random();
            if (palette < 0.4) {
                grad.addColorStop(0, 'rgba(255, 200, 150, 0.4)');
                grad.addColorStop(0.4, 'rgba(255, 100, 50, 0.2)');
                grad.addColorStop(0.7, 'rgba(100, 50, 0, 0.1)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else if (palette < 0.7) {
                grad.addColorStop(0, 'rgba(200, 240, 255, 0.3)');
                grad.addColorStop(0.4, 'rgba(100, 180, 255, 0.15)');
                grad.addColorStop(0.8, 'rgba(0, 50, 100, 0)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else {
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
                grad.addColorStop(0.2, 'rgba(255, 255, 0, 0.15)');
                grad.addColorStop(0.4, 'rgba(255, 0, 0, 0.1)');
                grad.addColorStop(0.6, 'rgba(0, 0, 255, 0.1)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            }
        }

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = grad;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1 + random() * 0.5, 1);
        ctx.rotate(random() * Math.PI * 2);
        ctx.translate(-x, -y);

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    const numBokeh = 3 + Math.floor(random() * 5);

    for (let i = 0; i < numBokeh; i++) {
        const bx = random() * w;
        const by = random() * h;
        const br = w * (0.1 + random() * 0.2);

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

// --- Filter thumbnail strip ---

// CSS filter approximations for thumbnails (avoids pixel manipulation on tiny canvases)
function getFilterCSSForThumb(filterId) {
    switch (filterId) {
        case 'portra':    return 'brightness(1.1) contrast(1.08) saturate(1.3) sepia(0.22)';
        case 'ektar':     return 'contrast(1.35) saturate(1.7) brightness(1.0) hue-rotate(-8deg)';
        case 'velvia':    return 'contrast(1.5) saturate(2.2) brightness(0.88) hue-rotate(-14deg)';
        case 'pro400h':   return 'brightness(1.25) contrast(0.88) saturate(1.1) sepia(0.12)';
        case 'cinestill': return 'contrast(1.1) saturate(1.2) hue-rotate(-20deg) brightness(1.05)';
        case 'polaroid':  return 'contrast(0.9) brightness(1.1) saturate(0.8) sepia(0.25)';
        case 'expired':   return 'contrast(0.85) brightness(1.2) sepia(0.5) saturate(0.7)';
        case 'ilford':    return 'grayscale(1) contrast(1.15) brightness(1.05)';
        case 'bw-high':   return 'grayscale(1) contrast(1.5) brightness(1.05)';
        default:          return 'none';
    }
}

// Color gradient swatches shown before an image is loaded
const FILTER_SWATCHES = {
    none:      ['#888888', '#555555'],
    portra:    ['#c8a070', '#8b5530'],
    ektar:     ['#d04030', '#203080'],
    velvia:    ['#20a050', '#4020a0'],
    pro400h:   ['#90c8d8', '#5070a0'],
    cinestill: ['#304090', '#a03010'],
    polaroid:  ['#c0a060', '#806040'],
    expired:   ['#c09040', '#804000'],
    ilford:    ['#c0c0c0', '#404040'],
    'bw-high': ['#ffffff', '#000000'],
};

function drawThumbnail(thumbCanvas, img, filterId) {
    const tw = thumbCanvas.width;
    const th = thumbCanvas.height;
    const tCtx = thumbCanvas.getContext('2d');
    tCtx.clearRect(0, 0, tw, th);

    if (img) {
        tCtx.fillStyle = backgroundColor;
        tCtx.fillRect(0, 0, tw, th);

        const s = Math.min(tw / img.width, th / img.height);
        const w = img.width * s;
        const h = img.height * s;

        tCtx.filter = getFilterCSSForThumb(filterId);
        tCtx.drawImage(img, (tw - w) / 2, (th - h) / 2, w, h);
        tCtx.filter = 'none';

        // Apply color overlays matching the main filter
        if (filterId === 'pro400h') {
            tCtx.globalCompositeOperation = 'overlay';
            tCtx.fillStyle = 'rgba(0, 120, 140, 0.25)';
            tCtx.fillRect(0, 0, tw, th);
        } else if (filterId === 'cinestill') {
            tCtx.globalCompositeOperation = 'soft-light';
            tCtx.fillStyle = 'rgba(0, 50, 255, 0.30)';
            tCtx.fillRect(0, 0, tw, th);
        } else if (filterId === 'polaroid') {
            tCtx.globalCompositeOperation = 'overlay';
            tCtx.fillStyle = 'rgba(255, 150, 50, 0.2)';
            tCtx.fillRect(0, 0, tw, th);
        } else if (filterId === 'expired') {
            tCtx.globalCompositeOperation = 'screen';
            tCtx.fillStyle = 'rgba(255, 0, 100, 0.12)';
            tCtx.fillRect(0, 0, tw, th);
        }
        tCtx.globalCompositeOperation = 'source-over';
    } else {
        // No image: gradient swatch representing the filter's mood
        const [c1, c2] = FILTER_SWATCHES[filterId] || ['#888', '#555'];
        const grad = tCtx.createLinearGradient(0, 0, tw, th);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        tCtx.fillStyle = grad;
        tCtx.fillRect(0, 0, tw, th);
    }
}

function buildFilterStrip() {
    const strip = document.getElementById('filter-strip');
    strip.innerHTML = '';

    FILTERS.forEach(f => {
        const item = document.createElement('div');
        item.className = 'filter-item' + (f.id === currentFilter ? ' active' : '');
        item.dataset.filter = f.id;

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 72;
        thumbCanvas.height = 128;

        const label = document.createElement('span');
        label.textContent = f.name;

        item.appendChild(thumbCanvas);
        item.appendChild(label);
        strip.appendChild(item);

        item.addEventListener('click', () => {
            currentFilter = f.id;
            document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            draw();
        });

        drawThumbnail(thumbCanvas, null, f.id);
    });
}

function updateThumbnails() {
    document.querySelectorAll('.filter-item').forEach(item => {
        const thumbCanvas = item.querySelector('canvas');
        drawThumbnail(thumbCanvas, currentImage, item.dataset.filter);
    });
}

// --- Event Listeners ---

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        e.target.value = '';

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;

                // Reset scale when loading a new image in Story mode
                if (appMode === 'story') {
                    scale = 1.0;
                }
                scaleValue.textContent = `${scale.toFixed(2)}x`;
                draw();
                updateThumbnails();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Scale buttons with hold-to-repeat
let scaleRepeatTimer = null;
let scaleRepeatInterval = null;

function updateScale(delta) {
    scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale + delta));
    scaleValue.textContent = `${scale.toFixed(2)}x`;
    draw();
}

function startScaleRepeat(direction) {
    const delta = direction === 'up' ? SCALE_STEP : -SCALE_STEP;
    updateScale(delta);
    scaleRepeatTimer = setTimeout(() => {
        scaleRepeatInterval = setInterval(() => updateScale(delta), 80);
    }, 400);
}

function stopScaleRepeat() {
    clearTimeout(scaleRepeatTimer);
    clearInterval(scaleRepeatInterval);
    scaleRepeatTimer = null;
    scaleRepeatInterval = null;
}

['mousedown', 'touchstart'].forEach(evt => {
    scaleDownBtn.addEventListener(evt, (e) => { e.preventDefault(); startScaleRepeat('down'); });
    scaleUpBtn.addEventListener(evt, (e) => { e.preventDefault(); startScaleRepeat('up'); });
});

['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(evt => {
    scaleDownBtn.addEventListener(evt, stopScaleRepeat);
    scaleUpBtn.addEventListener(evt, stopScaleRepeat);
});

leakToggleBtn.addEventListener('click', () => {
    isLightLeakEnabled = !isLightLeakEnabled;
    leakToggleBtn.classList.toggle('active-toggle', isLightLeakEnabled);
    randomLeakBtn.classList.toggle('hidden', !isLightLeakEnabled);
    draw();
});

grainToggleBtn.addEventListener('click', () => {
    isGrainEnabled = !isGrainEnabled;
    grainToggleBtn.classList.toggle('active-toggle', isGrainEnabled);
    draw();
});

prismToggleBtn.addEventListener('click', () => {
    isPrismEnabled = !isPrismEnabled;
    prismToggleBtn.classList.toggle('active-toggle', isPrismEnabled);
    randomPrismBtn.classList.toggle('hidden', !isPrismEnabled);
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
                showToast('Failed to generate image');
                return;
            }

            const file = new File([blob], `insta-story-${Date.now()}.jpg`, { type: 'image/jpeg' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'InstaCanvas Story',
                        text: 'Here is my new story canvas!'
                    });
                    return;
                } catch (shareError) {
                    console.log('Share failed or cancelled, falling back to download/modal', shareError);
                }
            }

            const url = URL.createObjectURL(blob);
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (!isMobile) {
                const link = document.createElement('a');
                link.download = file.name;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
                modalImg.src = url;
                modal.classList.add('active');
            }

        }, 'image/jpeg', 0.95);
    } catch (error) {
        console.error('Error saving image:', error);
        showToast('Failed to save image');
    }
});

let longPressTimer;
let isLongPress = false;

function saveFavorite() {
    localStorage.setItem('favScale', scale);
    showToast(`Saved ${scale.toFixed(2)}x as favorite`);
    updateFavButtonTitle();
}

function loadFavorite() {
    const savedScale = localStorage.getItem('favScale');
    if (savedScale) {
        scale = parseFloat(savedScale);
        scaleValue.textContent = `${scale.toFixed(2)}x`;
        draw();
    } else {
        saveFavorite();
    }
}

function updateFavButtonTitle() {
    const savedScale = localStorage.getItem('favScale');
    if (savedScale) {
        favBtn.title = `Tap to load ${parseFloat(savedScale).toFixed(2)}x · Hold to save current`;
    } else {
        favBtn.title = 'Hold to save current size as favorite';
    }
}

updateFavButtonTitle();

favBtn.addEventListener('mousedown', () => {
    isLongPress = false;
    longPressTimer = setTimeout(() => {
        isLongPress = true;
        saveFavorite();
    }, 600);
});

favBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isLongPress = false;
    longPressTimer = setTimeout(() => {
        isLongPress = true;
        saveFavorite();
    }, 600);
});

favBtn.addEventListener('mouseup', () => clearTimeout(longPressTimer));
favBtn.addEventListener('mouseleave', () => clearTimeout(longPressTimer));

favBtn.addEventListener('touchend', () => {
    clearTimeout(longPressTimer);
    if (!isLongPress) loadFavorite();
});

favBtn.addEventListener('click', (e) => {
    if (isLongPress) return;
    loadFavorite();
});

// --- Mode tabs ---

const storyControls = document.getElementById('story-controls');
const tabBtns = document.querySelectorAll('.tab-btn');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        appMode = btn.dataset.mode;

        if (appMode === 'story') {
            storyControls.classList.remove('hidden');
        } else {
            storyControls.classList.add('hidden');
        }

        draw();
    });
});

// Initialize
buildFilterStrip();
initCanvas();

const updateSW = registerSW({
    onNeedRefresh() {
        const msg = document.createElement('div');
        msg.className = 'toast toast-visible toast-update';
        msg.innerHTML = `<span>Update available</span><button class="toast-update-btn">Reload</button>`;
        msg.querySelector('button').addEventListener('click', () => updateSW(true));
        document.getElementById('app').appendChild(msg);
    },
})
