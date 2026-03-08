// Image Filters — CSS filter → Canvas render
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const editorSection = document.getElementById('editor-section');
const previewCanvas = document.getElementById('preview-canvas');
const ctx2 = previewCanvas.getContext('2d');
let img = new Image();
let fileName = 'filtered';

const sliders = {
  brightness: document.getElementById('sl-brightness'),
  contrast:   document.getElementById('sl-contrast'),
  saturation: document.getElementById('sl-saturation'),
  blur:       document.getElementById('sl-blur'),
  hue:        document.getElementById('sl-hue'),
};
const vals = {
  brightness: document.getElementById('val-brightness'),
  contrast:   document.getElementById('val-contrast'),
  saturation: document.getElementById('val-saturation'),
  blur:       document.getElementById('val-blur'),
  hue:        document.getElementById('val-hue'),
};

const presets = {
  none:      { brightness:100, contrast:100, saturation:100, blur:0, hue:0 },
  grayscale: { brightness:100, contrast:110, saturation:0,   blur:0, hue:0 },
  sepia:     { brightness:100, contrast:110, saturation:0,   blur:0, hue:30 },
  vivid:     { brightness:110, contrast:130, saturation:180, blur:0, hue:0 },
  cool:      { brightness:100, contrast:105, saturation:90,  blur:0, hue:200 },
  warm:      { brightness:105, contrast:100, saturation:120, blur:0, hue:30 },
};

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => e.target.files[0] && loadImg(e.target.files[0]));
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files[0]) loadImg(e.dataTransfer.files[0]); });

function loadImg(file) {
  if (!file.type.startsWith('image/')) { alert('Please upload an image.'); return; }
  fileName = file.name.replace(/\.[^.]+$/, '');
  const reader = new FileReader();
  reader.onload = e => {
    img.onload = () => {
      const maxW = Math.min(img.width, 900);
      const scale = maxW / img.width;
      previewCanvas.width = Math.round(img.width * scale);
      previewCanvas.height = Math.round(img.height * scale);
      applyFilters();
      uploadSection.classList.add('hidden');
      editorSection.classList.remove('hidden');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function getFilterString() {
  return `brightness(${sliders.brightness.value}%) contrast(${sliders.contrast.value}%) saturate(${sliders.saturation.value}%) blur(${sliders.blur.value}px) hue-rotate(${sliders.hue.value}deg)`;
}

function applyFilters() {
  ctx2.filter = getFilterString();
  ctx2.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  ctx2.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
  ctx2.filter = 'none';
  vals.brightness.textContent = sliders.brightness.value + '%';
  vals.contrast.textContent   = sliders.contrast.value + '%';
  vals.saturation.textContent = sliders.saturation.value + '%';
  vals.blur.textContent       = sliders.blur.value + 'px';
  vals.hue.textContent        = sliders.hue.value + '°';
}

Object.values(sliders).forEach(sl => sl.addEventListener('input', applyFilters));

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = presets[btn.dataset.preset];
    if (!p) return;
    Object.keys(p).forEach(k => { sliders[k].value = p[k]; });
    applyFilters();
  });
});

document.getElementById('btn-reset').addEventListener('click', () => {
  Object.keys(presets.none).forEach(k => { sliders[k].value = presets.none[k]; });
  applyFilters();
});

document.getElementById('btn-download').addEventListener('click', () => {
  // Render at full original resolution
  const outCanvas = document.createElement('canvas');
  outCanvas.width = img.width; outCanvas.height = img.height;
  const octx = outCanvas.getContext('2d');
  octx.filter = getFilterString();
  octx.drawImage(img, 0, 0);
  octx.filter = 'none';
  const a = document.createElement('a');
  a.href = outCanvas.toDataURL('image/png');
  a.download = fileName + '-filtered.png';
  a.click();
});

document.getElementById('btn-new-image').addEventListener('click', () => location.reload());
