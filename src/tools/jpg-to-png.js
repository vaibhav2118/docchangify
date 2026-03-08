const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const resultZone = document.getElementById('result-zone');
const previewOriginal = document.getElementById('preview-original');
const previewConverted = document.getElementById('preview-converted');
const originalFilename = document.getElementById('original-filename');
const originalSize = document.getElementById('original-size');
const convertedSize = document.getElementById('converted-size');
const btnReset = document.getElementById('btn-reset');
const btnDownload = document.getElementById('btn-download');

let currentFile = null;

function formatBytes(bytes) {
    if (!+bytes) return '0 Bytes';
    const k = 1024, i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB'][i]}`;
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); }, false));
['dragenter', 'dragover'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.add('border-blue-500', 'bg-blue-50'), false));
['dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.remove('border-blue-500', 'bg-blue-50'), false));

dropZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files), false);
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFiles(e.target.files));

function handleFiles(files) {
  if (files.length === 0) return;
  const file = files[0];
  if (!file.type.match('image/jpeg')) return alert('Please upload a JPG/JPEG file.');
  processFile(file);
}

function processFile(file) {
  currentFile = file;
  originalFilename.textContent = file.name;
  originalSize.textContent = formatBytes(file.size);
  const originalUrl = URL.createObjectURL(file);
  previewOriginal.src = originalUrl;
  
  const img = new Image();
  img.onload = () => convertAndShow(img);
  img.src = originalUrl;
  
  dropZone.classList.add('hidden');
  resultZone.classList.remove('hidden'); resultZone.classList.add('flex');
}

function convertAndShow(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  const dataUrl = canvas.toDataURL('image/png'); // Output as PNG
  previewConverted.src = dataUrl;
  
  const base64Length = dataUrl.split(',')[1].length;
  // Account for base64 padding
  const paddingMatches = dataUrl.match(/=*$/);
  const paddingLength = paddingMatches ? paddingMatches[0].length : 0;
  convertedSize.textContent = formatBytes(Math.floor((base64Length * 3) / 4) - paddingLength);
  
  btnDownload.href = dataUrl;
  btnDownload.download = currentFile.name.replace(/\.jpe?g$/i, '.png');
}

btnReset.addEventListener('click', () => {
  fileInput.value = '';
  dropZone.classList.remove('hidden');
  resultZone.classList.add('hidden'); resultZone.classList.remove('flex');
});
