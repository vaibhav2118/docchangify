// Rotate & Flip Image — Canvas API
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const editorSection = document.getElementById('editor-section');
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');
const transformLabel = document.getElementById('transform-label');

let img = new Image(), fileName = 'image';
let rotation = 0; // degrees: 0, 90, 180, 270
let flipH = false, flipV = false;

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => e.target.files[0] && loadImg(e.target.files[0]));
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files[0]) loadImg(e.dataTransfer.files[0]); });

function loadImg(file) {
  if (!file.type.startsWith('image/')) { alert('Please upload an image.'); return; }
  fileName = file.name.replace(/\.[^.]+$/, '');
  const reader = new FileReader();
  reader.onload = e => { img.onload = () => { rotation=0; flipH=false; flipV=false; draw(); uploadSection.classList.add('hidden'); editorSection.classList.remove('hidden'); }; img.src = e.target.result; };
  reader.readAsDataURL(file);
}

function draw(targetCanvas, targetCtx) {
  const c = targetCanvas || canvas;
  const x = targetCtx || ctx;
  const isRotated90 = rotation === 90 || rotation === 270;
  const maxW = Math.min(isRotated90 ? img.height : img.width, 900);
  const scale = maxW / (isRotated90 ? img.height : img.width);
  const dw = Math.round((isRotated90 ? img.height : img.width) * scale);
  const dh = Math.round((isRotated90 ? img.width : img.height) * scale);

  if (!targetCanvas) { c.width = dw; c.height = dh; }

  x.save();
  x.translate(c.width/2, c.height/2);
  x.rotate(rotation * Math.PI / 180);
  x.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  const sw = Math.round(img.width * scale), sh = Math.round(img.height * scale);
  x.drawImage(img, -sw/2, -sh/2, sw, sh);
  x.restore();

  const parts = [];
  if (rotation) parts.push(`Rotated ${rotation}°`);
  if (flipH) parts.push('Flipped H');
  if (flipV) parts.push('Flipped V');
  transformLabel.textContent = parts.length ? parts.join(', ') : 'No transforms applied yet';
}

document.getElementById('btn-r90').addEventListener('click', () => { rotation = (rotation + 90) % 360; draw(); });
document.getElementById('btn-r-90').addEventListener('click', () => { rotation = (rotation + 270) % 360; draw(); });
document.getElementById('btn-r180').addEventListener('click', () => { rotation = (rotation + 180) % 360; draw(); });
document.getElementById('btn-flip-h').addEventListener('click', () => { flipH = !flipH; draw(); });
document.getElementById('btn-flip-v').addEventListener('click', () => { flipV = !flipV; draw(); });
document.getElementById('btn-reset').addEventListener('click', () => { rotation=0; flipH=false; flipV=false; draw(); });
document.getElementById('btn-new').addEventListener('click', () => location.reload());

document.getElementById('btn-download').addEventListener('click', () => {
  const isRotated90 = rotation === 90 || rotation === 270;
  const out = document.createElement('canvas');
  out.width = isRotated90 ? img.height : img.width;
  out.height = isRotated90 ? img.width : img.height;
  const overrideScale = 1;
  const octx = out.getContext('2d');
  octx.save();
  octx.translate(out.width/2, out.height/2);
  octx.rotate(rotation * Math.PI / 180);
  octx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  octx.drawImage(img, -img.width/2, -img.height/2);
  octx.restore();
  const a = document.createElement('a');
  a.href = out.toDataURL('image/png');
  a.download = `${fileName}-transformed.png`;
  a.click();
});
