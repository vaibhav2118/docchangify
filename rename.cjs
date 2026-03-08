const fs = require('fs');
const path = require('path');

const directories = ['.', 'src', 'src/tools'];

directories.forEach(dir => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    // Make sure it's a file before processing
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) return;

    if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.md')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // Case sensitive replacement
      if (content.includes('ConvertEra')) {
        content = content.replace(/ConvertEra/g, 'DocChangify');
        modified = true;
      }
      
      // Email / domains
      if (content.includes('convertera.app')) {
         content = content.replace(/convertera\.app/g, 'docchangify.app');
         modified = true;
      }
      
      // Task and Artifacts files might have mixed casing
      if (content.includes('convertera') && file.endsWith('.md')) {
         content = content.replace(/convertera/gi, 'docchangify');
         modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  });
});
