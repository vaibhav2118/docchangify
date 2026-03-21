// YouTube Banner Formatter — Accurate Logic
// Dimensions: 2560 x 1440 (Full/TV), 1546 x 423 (Mobile Safe Area), 1855 x 423 (Tablet), 2560 x 423 (Desktop)

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const editorSection = document.getElementById('editor-section');
const mainCanvas = document.getElementById('banner-canvas');
const ctx = mainCanvas.getContext('2d');

const zoomSlider = document.getElementById('zoom-slider');
const zoomVal = document.getElementById('zoom-val');
const btnChangeImage = document.getElementById('btn-change-image');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnAutoFix = document.getElementById('btn-auto-fix');
const btnToggleGuides = document.getElementById('btn-toggle-guides');
const btnReset = document.getElementById('btn-reset');
const btnDownloadPng = document.getElementById('btn-download-png');
const btnDownloadJpg = document.getElementById('btn-download-jpg');

const prevMobile = document.getElementById('prev-mobile');
const prevTablet = document.getElementById('prev-tablet');
const prevDesktop = document.getElementById('prev-desktop');
const prevTv = document.getElementById('prev-tv');

const overlayGuides = document.getElementById('overlay-guides');

// --- Button Listeners ---
btnChangeImage.addEventListener('click', () => fileInput.click());

btnZoomIn.addEventListener('click', () => {
    zoomSlider.value = Math.min(parseInt(zoomSlider.value) + 1, 500);
    updateZoom();
});

btnZoomOut.addEventListener('click', () => {
    zoomSlider.value = Math.max(parseInt(zoomSlider.value) - 1, 5);
    updateZoom();
});

function updateZoom() {
    state.scale = zoomSlider.value / 100;
    zoomVal.textContent = zoomSlider.value + '%';
    render();
}

// Dimensions Constants
const TARGET_W = 2560;
const TARGET_H = 1440;
const SAFE_W = 1546;
const SAFE_H = 423;
const TABLET_W = 1855;
const DESKTOP_H = 423;

let originalImg = new Image();
let state = {
  imgLoaded: false,
  x: TARGET_W / 2, // Layer Center X
  y: TARGET_H / 2, // Layer Center Y
  scale: 1,
  guidesOn: true,
  blurBg: true
};

let isDragging = false;
let startX = 0, startY = 0;
let lastX = 0, lastY = 0;

// Init internal resolution
mainCanvas.width = TARGET_W;
mainCanvas.height = TARGET_H;

// --- Upload Handler ---
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => e.target.files[0] && loadImage(e.target.files[0]));
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('bg-red-50/50'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('bg-red-50/50'));
dropZone.addEventListener('drop', e => { 
  e.preventDefault(); 
  dropZone.classList.remove('bg-red-50/50');
  if (e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]); 
});

function loadImage(file) {
  if (!file.type.startsWith('image/')) { alert('Please upload an image.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    originalImg.onload = () => {
      state.imgLoaded = true;
      state.x = TARGET_W / 2;
      state.y = TARGET_H / 2;
      smartFit(); // Initial smart fit
      uploadSection.classList.add('hidden');
      editorSection.classList.remove('hidden');
      render();
    };
    originalImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function smartFit() {
  if (!state.imgLoaded) return;
  // Goal: Fit the image so it covers the Safe Area (1546x423) or fills its height
  // YouTube banners are tricky. If the image is 16:9, we probably want it to fill the safe area's height.
  // But to be "Pro", we should make it fill at least the Safe Area center.
  const scaleW = SAFE_W / originalImg.width;
  const scaleH = SAFE_H / originalImg.height;
  
  // We take the max of scaling to fill width or height of SAFE zone.
  // This ensures there are no blurred bars INSIDE the 1546x423 box if possible.
  state.scale = Math.max(scaleW, scaleH);
  
  // Update UI components
  zoomSlider.value = Math.round(state.scale * 100);
  zoomVal.textContent = zoomSlider.value + '%';
}

// --- Interaction Logic ---
mainCanvas.addEventListener('mousedown', e => {
  if (!state.imgLoaded) return;
  isDragging = true;
  const rect = mainCanvas.getBoundingClientRect();
  const displayScale = TARGET_W / rect.width;
  
  startX = e.clientX * displayScale;
  startY = e.clientY * displayScale;
  lastX = state.x;
  lastY = state.y;
  mainCanvas.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const rect = mainCanvas.getBoundingClientRect();
  const displayScale = TARGET_W / rect.width;
  
  const curX = e.clientX * displayScale;
  const curY = e.clientY * displayScale;
  
  state.x = lastX + (curX - startX);
  state.y = lastY + (curY - startY);
  render();
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  mainCanvas.style.cursor = 'grab';
});

zoomSlider.addEventListener('input', updateZoom);

btnAutoFix.addEventListener('click', () => {
  smartFit();
  render();
});

btnToggleGuides.addEventListener('click', () => {
  state.guidesOn = !state.guidesOn;
  overlayGuides.classList.toggle('active', state.guidesOn);
  btnToggleGuides.innerHTML = state.guidesOn ? '<i class="ph ph-eye"></i> Guides' : '<i class="ph ph-eye-slash"></i> Guides';
});

btnReset.addEventListener('click', () => {
  if(confirm('Reset position and zoom?')) {
    state.x = TARGET_W / 2;
    state.y = TARGET_H / 2;
    smartFit();
    render();
  }
});

// --- Core Rendering ---
function render() {
  if (!state.imgLoaded) return;

  // Clear
  ctx.clearRect(0, 0, TARGET_W, TARGET_H);
  
  // 1. Draw Blurred Background (TV Full)
  if (state.blurBg) {
    ctx.save();
    ctx.filter = 'blur(60px) brightness(0.6)';
    const bScale = Math.max(TARGET_W / originalImg.width, TARGET_H / originalImg.height);
    ctx.drawImage(originalImg, 
      TARGET_W/2 - (originalImg.width * bScale)/2, 
      TARGET_H/2 - (originalImg.height * bScale)/2, 
      originalImg.width * bScale, 
      originalImg.height * bScale
    );
    ctx.restore();
  }

  // 2. Draw Main Image Layer
  ctx.save();
  const dw = originalImg.width * state.scale;
  const dh = originalImg.height * state.scale;
  
  // Apply shadow to separate from background
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 40;
  
  ctx.drawImage(originalImg, state.x - dw/2, state.y - dh/2, dw, dh);
  ctx.restore();

  updatePreviews();
}

function updatePreviews() {
  // Mobile: 1546 x 423
  // Tablet: 1855 x 423
  // Desktop: 2560 x 423
  // TV: 2560 x 1440
  
  // TV is easy
  prevTv.src = mainCanvas.toDataURL('image/jpeg', 0.5);

  const temp = document.createElement('canvas');
  const tctx = temp.getContext('2d');

  const offsetH = (TARGET_H - DESKTOP_H) / 2;

  // Desktop (2560 x 423)
  temp.width = 2560; temp.height = 423;
  tctx.drawImage(mainCanvas, 0, offsetH, 2560, 423, 0, 0, 2560, 423);
  prevDesktop.src = temp.toDataURL('image/jpeg', 0.5);

  // Tablet (1855 x 423)
  temp.width = 1855; temp.height = 423;
  tctx.clearRect(0, 0, 1855, 423);
  tctx.drawImage(mainCanvas, (TARGET_W - 1855)/2, offsetH, 1855, 423, 0, 0, 1855, 423);
  prevTablet.src = temp.toDataURL('image/jpeg', 0.5);

  // Mobile (1546 x 423)
  temp.width = 1546; temp.height = 423;
  tctx.clearRect(0, 0, 1546, 423);
  tctx.drawImage(mainCanvas, (TARGET_W - 1546)/2, offsetH, 1546, 423, 0, 0, 1546, 423);
  prevMobile.src = temp.toDataURL('image/jpeg', 0.5);
}

// --- Download Handler ---
function download(format) {
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'png' ? 1 : 0.95;
  
  // Ensure we export exactly 2560x1440 without UI overlays
  // The current mainCanvas state IS exactly that. The overlays are HTML/CSS.
  // We just need to trigger the dataURL.
  
  const dataURL = mainCanvas.toDataURL(mime, quality);
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = `youtube-banner-${Date.now()}.${format}`;
  link.click();
}

btnDownloadPng.addEventListener('click', () => download('png'));
btnDownloadJpg.addEventListener('click', () => download('jpg'));

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
}
if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
