const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const resultZone = document.getElementById('result-zone');

const previewOriginal = document.getElementById('preview-original');
const previewCompressed = document.getElementById('preview-compressed');
const originalFilename = document.getElementById('original-filename');
const originalSize = document.getElementById('original-size');
const compressedSize = document.getElementById('compressed-size');
const qualitySlider = document.getElementById('quality-slider');
const savingsBadge = document.getElementById('savings-badge');
const dimensionsInfo = document.getElementById('dimensions-info');

const btnReset = document.getElementById('btn-reset');
const btnDownload = document.getElementById('btn-download');

// Target Size Elements
const targetSizeInput = document.getElementById('target-size-input');
const targetSizeUnit = document.getElementById('target-size-unit');
const btnCompressTarget = document.getElementById('btn-compress-target');
const targetSizeMsg = document.getElementById('target-size-msg');

let currentFile = null;
let currentImageInstance = null;
let originalBytes = 0;

function formatBytes(bytes) {
    if (!+bytes) return '0 Bytes';
    const k = 1024, i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB'][i]}`;
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); }, false));
['dragenter', 'dragover'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.add('border-green-500', 'bg-green-50'), false));
['dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.remove('border-green-500', 'bg-green-50'), false));

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
  originalBytes = file.size;
  
  originalFilename.textContent = file.name;
  originalSize.textContent = formatBytes(originalBytes);
  const originalUrl = URL.createObjectURL(file);
  previewOriginal.src = originalUrl;
  
  const img = new Image();
  img.onload = () => {
    currentImageInstance = img;
    dimensionsInfo.textContent = `${img.width} × ${img.height} px`;
    compressAndShow(parseFloat(qualitySlider.value));
  };
  img.src = originalUrl;
  
  dropZone.classList.add('hidden');
  resultZone.classList.remove('hidden'); resultZone.classList.add('flex');
}

function compressAndShow(quality) {
  const canvas = document.createElement('canvas');
  canvas.width = currentImageInstance.width; 
  canvas.height = currentImageInstance.height;
  const ctx = canvas.getContext('2d');
  
  // Fill white if transparent
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(currentImageInstance, 0, 0);
  
  // Compress to webp or jpeg based on original if possible, default to jpeg for high compression
  let targetMime = currentFile.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(targetMime, quality);
  
  previewCompressed.src = dataUrl;
  
  const base64Length = dataUrl.split(',')[1].length;
  const paddingMatches = dataUrl.match(/=*$/);
  const paddingLength = paddingMatches ? paddingMatches[0].length : 0;
  const newSizeInBytes = Math.floor((base64Length * 3) / 4) - paddingLength;
  
  compressedSize.textContent = formatBytes(newSizeInBytes);
  
  // Calc savings
  const savings = ((originalBytes - newSizeInBytes) / originalBytes) * 100;
  if(savings > 0) {
    savingsBadge.textContent = `-${savings.toFixed(0)}%`;
    savingsBadge.classList.replace('bg-red-500', 'bg-green-500');
  } else {
    savingsBadge.textContent = `+${Math.abs(savings).toFixed(0)}%`;
    savingsBadge.classList.replace('bg-green-500', 'bg-red-500'); // if size increased
  }
  
  btnDownload.href = dataUrl;
  // Change ext to .jpg or .webp
  let newName = currentFile.name.replace(/\.[^/.]+$/, "");
  btnDownload.download = newName + (targetMime === 'image/webp' ? '.webp' : '.jpg');
}

qualitySlider.addEventListener('input', (e) => {
  if (currentImageInstance) compressAndShow(parseFloat(e.target.value));
});

btnReset.addEventListener('click', () => {
  fileInput.value = '';
  dropZone.classList.remove('hidden');
  resultZone.classList.add('hidden'); resultZone.classList.remove('flex');
  targetSizeMsg.classList.add('hidden');
});

// --- Advanced Target Size Compression ---
// Uses binary search to find the optimal quality/scale to hit a target byte size
btnCompressTarget.addEventListener('click', async () => {
  if (!currentImageInstance) return;
  const val = parseFloat(targetSizeInput.value);
  if (isNaN(val) || val <= 0) {
    targetSizeMsg.textContent = "Please enter a valid number.";
    targetSizeMsg.className = "text-xs font-medium mt-3 text-red-500";
    return;
  }
  
  const unit = targetSizeUnit.value;
  const targetBytes = unit === 'MB' ? val * 1024 * 1024 : val * 1024;
  
  btnCompressTarget.textContent = "Working...";
  btnCompressTarget.disabled = true;
  targetSizeMsg.classList.add('hidden');

  let minQ = 0.01;
  let maxQ = 1.0;
  let currentResolution = 1.0;
  let targetMime = currentFile.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const MAX_ITERATIONS = 8;

  const getBlobSize = (quality, scale) => {
    return new Promise((resolve) => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = currentImageInstance.width * scale;
        tempCanvas.height = currentImageInstance.height * scale;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(currentImageInstance, 0, 0, tempCanvas.width, tempCanvas.height);
        
        tempCanvas.toBlob((blob) => {
            resolve({ blob, quality, scale, url: URL.createObjectURL(blob) });
        }, targetMime, quality);
    });
  };

  let bestResult = null;

  // 1. Binary search on Quality
  for(let i=0; i<MAX_ITERATIONS; i++) {
    let midQ = (minQ + maxQ) / 2;
    let result = await getBlobSize(midQ, currentResolution);
    
    if (result.blob.size <= targetBytes) {
        bestResult = result;
        minQ = midQ; // try to push quality higher without going over budget
    } else {
        maxQ = midQ; 
    }
  }

  // 2. Binary search on Scale (if lowest quality is still too big)
  if (!bestResult || bestResult.blob.size > targetBytes * 1.05) { 
      let minScale = 0.05;
      let maxScale = 1.0;
      for(let i=0; i<6; i++) {
          let midScale = (minScale + maxScale) / 2;
          let result = await getBlobSize(0.01, midScale); // fixed lowest quality
          if (result.blob.size <= targetBytes) {
              bestResult = result;
              minScale = midScale;
          } else {
              maxScale = midScale;
          }
      }
  }

  // 3. Update UI with best found result
  if (bestResult) {
      qualitySlider.value = bestResult.quality; 
      previewCompressed.src = bestResult.url;
      compressedSize.textContent = formatBytes(bestResult.blob.size);
      
      const savings = ((originalBytes - bestResult.blob.size) / originalBytes) * 100;
      if(savings > 0) {
        savingsBadge.textContent = `-${savings.toFixed(0)}%`;
        savingsBadge.classList.replace('bg-red-500', 'bg-green-500');
      } else {
        savingsBadge.textContent = `+${Math.abs(savings).toFixed(0)}%`;
        savingsBadge.classList.replace('bg-green-500', 'bg-red-500');
      }
      
      dimensionsInfo.textContent = `${Math.round(currentImageInstance.width * bestResult.scale)} × ${Math.round(currentImageInstance.height * bestResult.scale)} px`;
      
      btnDownload.href = bestResult.url;
      let newName = currentFile.name.replace(/\.[^/.]+$/, "");
      btnDownload.download = newName + "_compressed" + (targetMime === 'image/webp' ? '.webp' : '.jpg');
      
      targetSizeMsg.textContent = `Success! Compressed to ${formatBytes(bestResult.blob.size)}`;
      targetSizeMsg.className = "text-xs font-medium mt-3 text-green-600 dark:text-green-400 block";
  } else {
      targetSizeMsg.textContent = "Could not compress to that size. Try a larger target.";
      targetSizeMsg.className = "text-xs font-medium mt-3 text-red-500 block";
  }

  btnCompressTarget.innerHTML = `<i class="ph ph-magic-wand"></i> Apply Target`;
  btnCompressTarget.disabled = false;
});
