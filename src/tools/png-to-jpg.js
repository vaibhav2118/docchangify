import '../../style.css';

// --- Theme Management (Reusable) ---
const themeToggle = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

function setTheme(isDark) {
  if (isDark) {
    htmlEl.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    htmlEl.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
}

const savedTheme = localStorage.getItem('theme');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
  setTheme(true);
} else {
  setTheme(false);
}

if(themeToggle) {
  themeToggle.addEventListener('click', () => {
    setTheme(!htmlEl.classList.contains('dark'));
  });
}

// --- Converter Logic ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const resultZone = document.getElementById('result-zone');

const previewOriginal = document.getElementById('preview-original');
const previewConverted = document.getElementById('preview-converted');
const originalFilename = document.getElementById('original-filename');
const originalSize = document.getElementById('original-size');
const convertedSize = document.getElementById('converted-size');
const qualitySlider = document.getElementById('quality-slider');

const btnReset = document.getElementById('btn-reset');
const btnDownload = document.getElementById('btn-download');

let currentFile = null;
let currentImageInstance = null; // Store the Image object for re-rendering with different quality

// Utils
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Drag & Drop Events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults (e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, highlight, false);
});
['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
  dropZone.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/10');
}
function unhighlight(e) {
  dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/10');
}

dropZone.addEventListener('drop', handleDrop, false);
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles(files);
}

function handleFiles(files) {
  if (files.length === 0) return;
  const file = files[0];
  
  if (!file.type.match('image/png')) {
    alert('Please upload a valid PNG file.');
    return;
  }
  
  processFile(file);
}

function processFile(file) {
  currentFile = file;
  
  // 1. Show Original Info
  originalFilename.textContent = file.name;
  originalSize.textContent = formatBytes(file.size);
  
  const originalUrl = URL.createObjectURL(file);
  previewOriginal.src = originalUrl;
  
  // 2. Load into Image object
  const img = new Image();
  img.onload = () => {
    currentImageInstance = img;
    convertAndShow(img, parseFloat(qualitySlider.value));
  };
  img.src = originalUrl;
  
  // Toggle UI
  dropZone.classList.add('hidden');
  resultZone.classList.remove('hidden');
  resultZone.classList.add('flex');
}

function convertAndShow(img, quality) {
  // Create Canvas
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  
  const ctx = canvas.getContext('2d');
  
  // Fill background with white (since JPG doesn't support transparency)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw Image
  ctx.drawImage(img, 0, 0);
  
  // Convert to JPG
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  
  // Show Converted Source
  previewConverted.src = dataUrl;
  
  // Calculate specific file size directly from base64 length
  // Length in bytes = (Base64 string length * 3 / 4) - padding
  const base64Length = dataUrl.split(',')[1].length;
  const sizeInBytes = Math.floor((base64Length * 3) / 4);
  convertedSize.textContent = formatBytes(sizeInBytes);
  
  // Setup Download
  const newFilename = currentFile.name.replace(/\.png$/i, '.jpg');
  btnDownload.href = dataUrl;
  btnDownload.download = newFilename;
}

// Adjust quality listener
qualitySlider.addEventListener('input', (e) => {
  if (currentImageInstance) {
    convertAndShow(currentImageInstance, parseFloat(e.target.value));
  }
});

// Reset logic
btnReset.addEventListener('click', () => {
  currentFile = null;
  currentImageInstance = null;
  fileInput.value = '';
  
  dropZone.classList.remove('hidden');
  resultZone.classList.add('hidden');
  resultZone.classList.remove('flex');
});
