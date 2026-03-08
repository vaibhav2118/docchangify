// Rich Text Editor — execCommand + contentEditable
const editor = document.getElementById('editor-content');
const wc = document.getElementById('wc');

function cmd(command, value = null) {
  document.execCommand(command, false, value);
  editor.focus();
}

function updateWordCount() {
  const text = editor.innerText.trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  wc.textContent = `${words} word${words !== 1 ? 's' : ''}`;
}

editor.addEventListener('input', updateWordCount);
updateWordCount();

// Toolbar command buttons
['bold','italic','underline','strikeThrough',
 'insertUnorderedList','insertOrderedList',
 'justifyLeft','justifyCenter','justifyRight',
 'indent','outdent','undo','redo'].forEach(command => {
  const btn = document.getElementById(`cmd-${command}`);
  if (btn) btn.addEventListener('mousedown', e => { e.preventDefault(); cmd(command); });
});

// Format select (paragraph/heading)
document.getElementById('sel-format').addEventListener('change', e => {
  cmd('formatBlock', e.target.value);
});

// Blockquote
document.getElementById('cmd-quote').addEventListener('mousedown', e => {
  e.preventDefault();
  cmd('formatBlock', 'blockquote');
});

// Horizontal rule
document.getElementById('cmd-hr').addEventListener('mousedown', e => {
  e.preventDefault();
  cmd('insertHorizontalRule');
});

// Text color
document.getElementById('txt-color').addEventListener('input', e => {
  cmd('foreColor', e.target.value);
});

// Background / highlight color
document.getElementById('bg-color').addEventListener('input', e => {
  cmd('hiliteColor', e.target.value);
});

// Clear
document.getElementById('btn-clear').addEventListener('click', () => {
  if (confirm('Clear all content?')) { editor.innerHTML = ''; updateWordCount(); }
});

// Copy plain text
document.getElementById('btn-copy-text').addEventListener('click', () => {
  navigator.clipboard.writeText(editor.innerText).then(() => {
    const btn = document.getElementById('btn-copy-text');
    btn.innerHTML = '<i class="ph ph-check"></i> Copied!';
    setTimeout(() => { btn.innerHTML = '<i class="ph ph-copy"></i> Copy Text'; }, 2000);
  });
});

// Download HTML
document.getElementById('btn-download-html').addEventListener('click', () => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Document</title>
  <style>
    body { font-family: system-ui,sans-serif; max-width: 840px; margin: 48px auto; padding: 0 24px; line-height: 1.8; color: #334155; }
    h1,h2,h3 { color: #0f172a; }
    blockquote { border-left: 4px solid #6366f1; padding-left: 16px; color: #64748b; font-style: italic; }
    a { color: #6366f1; }
    ul, ol { padding-left: 24px; }
  </style>
</head>
<body>
${editor.innerHTML}
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'document.html';
  a.click();
});

// Download plain text
document.getElementById('btn-download-txt').addEventListener('click', () => {
  const blob = new Blob([editor.innerText], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'document.txt';
  a.click();
});
