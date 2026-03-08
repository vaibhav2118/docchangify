// Markdown Editor — uses marked.js CDN
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const wordCount = document.getElementById('word-count');

marked.setOptions({ breaks: true, gfm: true });

function updatePreview() {
  preview.innerHTML = marked.parse(editor.value || '');
  const words = editor.value.trim().split(/\s+/).filter(Boolean).length;
  wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
}

editor.addEventListener('input', updatePreview);
updatePreview();

// Tab key support
editor.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    updatePreview();
  }
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (confirm('Clear all content?')) { editor.value = ''; updatePreview(); }
});

document.getElementById('btn-copy').addEventListener('click', () => {
  navigator.clipboard.writeText(editor.value).then(() => {
    const btn = document.getElementById('btn-copy');
    btn.innerHTML = '<i class="ph ph-check"></i> Copied!';
    setTimeout(() => { btn.innerHTML = '<i class="ph ph-copy"></i> Copy MD'; }, 2000);
  });
});

document.getElementById('btn-download-html').addEventListener('click', () => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 48px auto; padding: 0 24px; line-height: 1.8; color: #334155; }
    h1,h2,h3,h4 { color: #0f172a; margin-top: 1.5em; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; color: inherit; }
    blockquote { border-left: 4px solid #6366f1; padding-left: 16px; color: #64748b; font-style: italic; }
    a { color: #6366f1; }
    table { border-collapse: collapse; width: 100%; }
    th, td { padding: 8px 12px; border: 1px solid #e2e8f0; }
    th { background: #f1f5f9; }
  </style>
</head>
<body>
${marked.parse(editor.value || '')}
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'document.html'; a.click();
});

document.getElementById('btn-download-md').addEventListener('click', () => {
  const blob = new Blob([editor.value], { type: 'text/markdown' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'document.md'; a.click();
});
