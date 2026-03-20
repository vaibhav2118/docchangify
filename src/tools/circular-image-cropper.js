/**
 * Circular Image Cropper Tool
 * DocChangify - 100% Client-Side
 */

// ── ELEMENTS ─────────────────────────────────────────────────────────────────
const uploadSection = document.getElementById('upload-section');
const editorSection = document.getElementById('editor-section');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const imageToCrop = document.getElementById('image-to-crop');
const preview = document.getElementById('preview');

const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnRotate = document.getElementById('btn-rotate');
const btnReset = document.getElementById('btn-reset');
const btnNew = document.getElementById('btn-new');
const btnCrop = document.getElementById('btn-crop');

let cropper = null;

// ── INITIALIZATION ───────────────────────────────────────────────────────────

// Click on drop zone triggers file input
dropZone.addEventListener('click', () => fileInput.click());

// Drag & Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
  });
});

dropZone.addEventListener('drop', e => {
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    handleFile(file);
  }
});

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// ── CORE LOGIC ───────────────────────────────────────────────────────────────

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    imageToCrop.src = e.target.result;
    initCropper();
    uploadSection.classList.add('hidden');
    editorSection.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function initCropper() {
  if (cropper) cropper.destroy();

  cropper = new Cropper(imageToCrop, {
    aspectRatio: 1, // Focus on 1:1 for circular crop
    viewMode: 1,    // Keeps image within canvas
    dragMode: 'move', // Allow dragging the image
    autoCropArea: 1,  // Fully cover the canvas by default
    restore: false,
    guides: false,
    center: false,
    highlight: false,
    cropBoxMovable: false,
    cropBoxResizable: false,
    toggleDragModeOnDblclick: false,
    ready() {
      // Cropper is loaded
    },
    crop(event) {
      // Basic crop callback if needed
    }
  });
}

// ── BUTTON ACTIONS ──────────────────────────────────────────────────────────

btnZoomIn.addEventListener('click', () => cropper.zoom(0.1));
btnZoomOut.addEventListener('click', () => cropper.zoom(-0.1));
btnRotate.addEventListener('click', () => cropper.rotate(90));
btnReset.addEventListener('click', () => cropper.reset());
btnNew.addEventListener('click', () => {
  editorSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
});

/**
 * Perform the circular crop using Canvas
 */
btnCrop.addEventListener('click', () => {
    const canvas = cropper.getCroppedCanvas({
        width: 1000, // High quality output
        height: 1000,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });

    const circleCanvas = document.createElement('canvas');
    const ctx = circleCanvas.getContext('2d');
    const size = canvas.width;

    circleCanvas.width = size;
    circleCanvas.height = size;

    // Drawing the circular crop path
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(canvas, 0, 0, size, size);

    // Download the final image as PNG
    const link = document.createElement('a');
    link.download = `docchangify-round-crop-${Date.now()}.png`;
    link.href = circleCanvas.toDataURL('image/png', 1.0);
    link.click();
});
