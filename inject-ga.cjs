const fs = require('fs');

const analyticsCode = `
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-20SKLFV3YG"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-20SKLFV3YG');
    </script>`;

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Guard clause against multiple additions
  if (!content.includes('gtag/js?id=G-20SKLFV3YG')) {
    // Insert before closing </head>
    content = content.replace('</head>', `${analyticsCode}\n  </head>`);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Injected Google Analytics into: ${file}`);
  }
});
