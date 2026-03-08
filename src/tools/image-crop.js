// Image Crop Tool — Canvas API
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const editorSection = document.getElementById('editor-section');
const sourceCanvas = document.getElementById('source-canvas');
const ctx = sourceCanvas.getContext('2d');
const selection = document.getElementById('selection');
const selInfo = document.getElementById('sel-info');
const btnCrop = document.getElementById('btn-crop');
const resultSection = document.getElementById('result-section');
const resultImg = document.getElementById('result-img');
const resultInfo = document.getElementById('result-info');

let img = new Image();
let scale = 1;
let isDragging = false;
let startX = 0, startY = 0, selX = 0, selY = 0, selW = 0, selH = 0;
let hasSelection = false;

// Upload
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => e.target.files[0] && loadImage(e.target.files[0]));
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]); });

function loadImage(file) {
  if (!file.type.startsWith('image/')) { alert('Please upload an image.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    img.onload = () => {
      const maxW = Math.min(img.width, 900);
      scale = maxW / img.width;
      sourceCanvas.width = Math.round(img.width * scale);
      sourceCanvas.height = Math.round(img.height * scale);
      ctx.drawImage(img, 0, 0, sourceCanvas.width, sourceCanvas.height);
      uploadSection.classList.add('hidden');
      editorSection.classList.remove('hidden');
      resultSection.classList.add('hidden');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Drag selection on canvas
const container = document.getElementById('canvas-container');
container.addEventListener('mousedown', e => {
  const rect = sourceCanvas.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;
  isDragging = true;
  hasSelection = false;
  btnCrop.disabled = true;
  btnCrop.classList.add('opacity-50');
  selection.style.display = 'block';
  updateSelection(startX, startY, 0, 0);
});
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const rect = sourceCanvas.getBoundingClientRect();
  const curX = Math.min(Math.max(e.clientX - rect.left, 0), sourceCanvas.width);
  const curY = Math.min(Math.max(e.clientY - rect.top, 0), sourceCanvas.height);
  selX = Math.min(startX, curX);
  selY = Math.min(startY, curY);
  selW = Math.abs(curX - startX);
  selH = Math.abs(curY - startY);
  updateSelection(selX, selY, selW, selH);
  selInfo.textContent = `Selection: ${Math.round(selW / scale)} × ${Math.round(selH / scale)} px`;
});
window.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  if (selW > 10 && selH > 10) {
    hasSelection = true;
    btnCrop.disabled = false;
    btnCrop.classList.remove('opacity-50');
  }
});

function updateSelection(x, y, w, h) {
  selection.style.left = x + 'px';
  selection.style.top = y + 'px';
  selection.style.width = w + 'px';
  selection.style.height = h + 'px';
  selection.style.display = w > 0 && h > 0 ? 'block' : 'none';
}

document.getElementById('btn-reset-sel').addEventListener('click', () => {
  selection.style.display = 'none';
  hasSelection = false;
  btnCrop.disabled = true;
  btnCrop.classList.add('opacity-50');
  selInfo.textContent = 'No selection yet — click and drag on the image below.';
});

btnCrop.addEventListener('click', () => {
  if (!hasSelection) return;
  // Map canvas coords back to original image coords
  const origX = Math.round(selX / scale);
  const origY = Math.round(selY / scale);
  const origW = Math.round(selW / scale);
  const origH = Math.round(selH / scale);

  const out = document.createElement('canvas');
  out.width = origW;
  out.height = origH;
  out.getContext('2d').drawImage(img, origX, origY, origW, origH, 0, 0, origW, origH);
  const dataURL = out.toDataURL('image/png');
  resultImg.src = dataURL;
  resultInfo.textContent = `Cropped size: ${origW} × ${origH} px`;
  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

  document.getElementById('btn-download').onclick = () => {
    const a = document.createElement('a'); a.href = dataURL; a.download = 'cropped.png'; a.click();
  };
});

document.getElementById('btn-crop-again').addEventListener('click', () => {
  resultSection.classList.add('hidden');
  selection.style.display = 'none';
  hasSelection = false;
  btnCrop.disabled = true;
  btnCrop.classList.add('opacity-50');
  selInfo.textContent = 'No selection yet — click and drag on the image below.';
});

document.getElementById('btn-new-image').addEventListener('click', () => location.reload());
