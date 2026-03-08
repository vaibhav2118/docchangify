const modeEncodeBtn = document.getElementById('mode-encode');
const modeDecodeBtn = document.getElementById('mode-decode');
const inputText = document.getElementById('input-text');
const outputText = document.getElementById('output-text');
const inputLabel = document.getElementById('input-label');
const outputLabel = document.getElementById('output-label');
const btnClear = document.getElementById('btn-clear');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');

let isEncodeMode = true;

modeEncodeBtn.addEventListener('click', () => {
  isEncodeMode = true;
  modeEncodeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-md');
  modeEncodeBtn.classList.remove('bg-transparent', 'text-slate-500', 'hover:text-indigo-600');
  
  modeDecodeBtn.classList.remove('bg-indigo-600', 'text-white', 'shadow-md');
  modeDecodeBtn.classList.add('bg-transparent', 'text-slate-500', 'hover:text-indigo-600');
  
  inputLabel.textContent = 'PLAIN TEXT';
  outputLabel.textContent = 'BASE64 STRING';
  convertText();
});

modeDecodeBtn.addEventListener('click', () => {
  isEncodeMode = false;
  modeDecodeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-md');
  modeDecodeBtn.classList.remove('bg-transparent', 'text-slate-500', 'hover:text-indigo-600');
  
  modeEncodeBtn.classList.remove('bg-indigo-600', 'text-white', 'shadow-md');
  modeEncodeBtn.classList.add('bg-transparent', 'text-slate-500', 'hover:text-indigo-600');
  
  inputLabel.textContent = 'BASE64 STRING';
  outputLabel.textContent = 'PLAIN TEXT';
  convertText();
});

inputText.addEventListener('input', convertText);

function convertText() {
  const val = inputText.value;
  if (!val) {
    outputText.value = '';
    return;
  }
  
  try {
    if (isEncodeMode) {
      // Avoid unicode issues natively in btoa via UTF-8 encode
      outputText.value = btoa(encodeURIComponent(val).replace(/%([0-9A-F]{2})/g, (match, p1) => {
          return String.fromCharCode('0x' + p1);
      }));
    } else {
      outputText.value = decodeURIComponent(atob(val).split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    }
  } catch (e) {
    outputText.value = "Error: Invalid Input Format";
  }
}

btnClear.addEventListener('click', () => {
  inputText.value = '';
  outputText.value = '';
  inputText.focus();
});

btnCopy.addEventListener('click', () => {
  if(!outputText.value) return;
  navigator.clipboard.writeText(outputText.value).then(() => {
    const originalText = btnCopy.innerHTML;
    btnCopy.innerHTML = '<i class="ph ph-check text-sm"></i> Copied!';
    btnCopy.classList.replace('text-indigo-600', 'text-emerald-500');
    setTimeout(() => {
      btnCopy.innerHTML = originalText;
      btnCopy.classList.replace('text-emerald-500', 'text-indigo-600');
    }, 2000);
  });
});

btnDownload.addEventListener('click', () => {
  const val = outputText.value;
  if (!val) return;

  let blob, filename;

  if (isEncodeMode) {
    // When encoding, the output is always a Base64 text string
    blob = new Blob([val], { type: 'text/plain;charset=utf-8' });
    filename = 'encoded-base64.txt';
  } else {
    // When decoding, check if the output looks like a data URI
    // e.g. data:image/png;base64,iVBORw0KGgo...
    const dataUriMatch = val.match(/^data:([a-zA-Z0-9-+\/]+);base64,(.+)$/);
    if (dataUriMatch) {
      const mimeType = dataUriMatch[1];
      const base64Data = dataUriMatch[2];
      try {
        const byteString = atob(base64Data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        blob = new Blob([ab], { type: mimeType });
        // Guess extension based on mime type (e.g. image/png -> png)
        const ext = mimeType.split('/')[1] || 'bin';
        filename = `decoded-file.${ext}`;
      } catch (e) {
        // Fallback if binary parsing fails
        blob = new Blob([val], { type: 'text/plain;charset=utf-8' });
        filename = 'decoded-text.txt';
      }
    } else {
      // Normal decoded text
      blob = new Blob([val], { type: 'text/plain;charset=utf-8' });
      filename = 'decoded-text.txt';
    }
  }

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
});
