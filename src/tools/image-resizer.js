const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const resultZone = document.getElementById('result-zone');
const preview = document.getElementById('preview');

const inputWidth = document.getElementById('input-width');
const inputHeight = document.getElementById('input-height');
const btnLink = document.getElementById('btn-link');
const iconLink = document.getElementById('icon-link');

const btnApply = document.getElementById('btn-apply');
const btnDownload = document.getElementById('btn-download');
const btnReset = document.getElementById('btn-reset');

let currentFile = null;
let currentImageInstance = null;
let maintainAspectRatio = true;
let originalRatio = 1;

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); }, false));
['dragenter', 'dragover'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.add('border-purple-500', 'bg-purple-50'), false));
['dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.remove('border-purple-500', 'bg-purple-50'), false));

dropZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files), false);
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFiles(e.target.files));

function handleFiles(files) {
  if (files.length === 0) return;
  const file = files[0];
  if (!file.type.startsWith('image/')) return alert('Please upload an image file.');
  processFile(file);
}

function processFile(file) {
  currentFile = file;
  const originalUrl = URL.createObjectURL(file);
  
  const img = new Image();
  img.onload = () => {
    currentImageInstance = img;
    originalRatio = img.width / img.height;
    
    inputWidth.value = img.width;
    inputHeight.value = img.height;
    preview.src = originalUrl;
    
    btnDownload.classList.add('pointer-events-none', 'opacity-50');
    btnDownload.href = '#';
    btnDownload.removeAttribute('download');
  };
  img.src = originalUrl;
  
  dropZone.classList.add('hidden');
  resultZone.classList.remove('hidden'); resultZone.classList.add('grid');
}

// Aspect Ratio Logic
btnLink.addEventListener('click', () => {
  maintainAspectRatio = !maintainAspectRatio;
  if(maintainAspectRatio) {
    btnLink.classList.add('text-purple-600', 'dark:text-purple-400');
    btnLink.classList.remove('text-slate-400');
    iconLink.classList.replace('ph-link-break', 'ph-link');
    // Align height to width instantly
    if(inputWidth.value) {
       inputHeight.value = Math.round(inputWidth.value / originalRatio);
    }
  } else {
    btnLink.classList.remove('text-purple-600', 'dark:text-purple-400');
    btnLink.classList.add('text-slate-400');
    iconLink.classList.replace('ph-link', 'ph-link-break');
  }
});

inputWidth.addEventListener('input', (e) => {
  if (maintainAspectRatio && e.target.value) {
    inputHeight.value = Math.round(e.target.value / originalRatio);
  }
});

inputHeight.addEventListener('input', (e) => {
  if (maintainAspectRatio && e.target.value) {
    inputWidth.value = Math.round(e.target.value * originalRatio);
  }
});

// Apply resize via canvas
btnApply.addEventListener('click', () => {
  if(!currentImageInstance) return;
  
  const width = parseInt(inputWidth.value);
  const height = parseInt(inputHeight.value);
  
  if(!width || !height || width <= 0 || height <= 0) return alert('Please enter valid dimensions.');
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(currentImageInstance, 0, 0, width, height);
  const ext = currentFile.name.split('.').pop().toLowerCase();
  const mime = (ext === 'jpeg' || ext === 'jpg') ? 'image/jpeg' : 'image/png';
  
  const dataUrl = canvas.toDataURL(mime, 0.9);
  preview.src = dataUrl;
  
  btnDownload.href = dataUrl;
  btnDownload.download = `resized_${currentFile.name}`;
  btnDownload.classList.remove('pointer-events-none', 'opacity-50');
});

btnReset.addEventListener('click', () => {
  fileInput.value = '';
  dropZone.classList.remove('hidden');
  resultZone.classList.add('hidden'); resultZone.classList.remove('grid');
});
