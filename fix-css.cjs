const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('<link rel="stylesheet" href="/style.css" />')) {
    content = content.replace('</head>', '  <link rel="stylesheet" href="/style.css" />\n  </head>');
    fs.writeFileSync(file, content);
    console.log(`Updated HTML: ${file}`);
  }
});

let mainJs = fs.readFileSync('src/main.js', 'utf8');
if (mainJs.includes("import '../style.css';")) {
  mainJs = mainJs.replace("import '../style.css';", "// removed import for css to stop FOUC");
  fs.writeFileSync('src/main.js', mainJs);
  console.log('Updated main.js');
}
