// Image Watermark — Canvas API
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const editorSection = document.getElementById('editor-section');
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');
let img = new Image(), fileName = 'watermarked', scale = 1;

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
      scale = maxW / img.width;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      draw();
      uploadSection.classList.add('hidden');
      editorSection.classList.remove('hidden');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);

  const text     = document.getElementById('wm-text').value || '© DocChangify';
  const fontSize = parseInt(document.getElementById('wm-size').value) * scale;
  const opacity  = parseInt(document.getElementById('wm-opacity').value) / 100;
  const color    = document.getElementById('wm-color').value;
  const position = document.getElementById('wm-position').value;

  document.getElementById('val-size').textContent = document.getElementById('wm-size').value + 'px';
  document.getElementById('val-opacity').textContent = document.getElementById('wm-opacity').value + '%';

  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px Inter, sans-serif`;
  ctx.textBaseline = 'middle';

  const pad = fontSize * 0.6;
  const tw = ctx.measureText(text).width;

  if (position === 'tile') {
    const spacingX = tw + fontSize * 2;
    const spacingY = fontSize * 3;
    for (let y = 0; y < canvas.height + spacingY; y += spacingY) {
      for (let x = 0; x < canvas.width + spacingX; x += spacingX) {
        ctx.fillText(text, x - tw/2, y);
      }
    }
  } else {
    let x, y;
    if (position === 'bottom-right') { x = canvas.width - tw - pad; y = canvas.height - fontSize; }
    else if (position === 'bottom-left') { x = pad; y = canvas.height - fontSize; }
    else if (position === 'top-right') { x = canvas.width - tw - pad; y = fontSize; }
    else if (position === 'top-left') { x = pad; y = fontSize; }
    else { x = (canvas.width - tw) / 2; y = canvas.height / 2; }
    ctx.fillText(text, x, y);
  }
  ctx.globalAlpha = 1;
}

['wm-text','wm-size','wm-opacity','wm-color','wm-position'].forEach(id => {
  document.getElementById(id).addEventListener('input', draw);
  document.getElementById(id).addEventListener('change', draw);
});

document.getElementById('btn-download').addEventListener('click', () => {
  // Render at full resolution
  const out = document.createElement('canvas');
  out.width = img.width; out.height = img.height;
  const octx = out.getContext('2d');
  const origScale = scale;
  scale = 1;
  canvas.width = img.width; canvas.height = img.height;
  octx.drawImage(img, 0, 0);

  const text     = document.getElementById('wm-text').value || '© DocChangify';
  const fontSize = parseInt(document.getElementById('wm-size').value);
  const opacity  = parseInt(document.getElementById('wm-opacity').value) / 100;
  const color    = document.getElementById('wm-color').value;
  const position = document.getElementById('wm-position').value;

  octx.globalAlpha = opacity;
  octx.fillStyle = color;
  octx.font = `bold ${fontSize}px Inter, sans-serif`;
  octx.textBaseline = 'middle';
  const pad = fontSize * 0.6;
  const tw = octx.measureText(text).width;

  if (position === 'tile') {
    const spacingX = tw + fontSize * 2, spacingY = fontSize * 3;
    for (let y=0; y<img.height+spacingY; y+=spacingY) for (let x=0; x<img.width+spacingX; x+=spacingX) octx.fillText(text, x-tw/2, y);
  } else {
    let x, y;
    if (position === 'bottom-right') { x = img.width - tw - pad; y = img.height - fontSize; }
    else if (position === 'bottom-left') { x = pad; y = img.height - fontSize; }
    else if (position === 'top-right') { x = img.width - tw - pad; y = fontSize; }
    else if (position === 'top-left') { x = pad; y = fontSize; }
    else { x = (img.width - tw) / 2; y = img.height / 2; }
    octx.fillText(text, x, y);
  }

  const a = document.createElement('a');
  a.href = out.toDataURL('image/png');
  a.download = `${fileName}-watermarked.png`;
  a.click();

  // Restore preview
  scale = origScale;
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  draw();
});

document.getElementById('btn-new-image').addEventListener('click', () => location.reload());
