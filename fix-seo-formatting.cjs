const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // replace literal \n\n with actual newlines
  if (content.indexOf('\\\\n\\\\n') !== -1 || content.indexOf('\\n') !== -1) {
     content = content.replace(/\\n/g, '\n');
     fs.writeFileSync(file, content, 'utf8');
     console.log('Fixed escape issues in: ' + file);
  }
});
