const fs = require('fs');

const tools = {
  "base64": "Base64 Encoder / Decoder",
  "compress-pdf": "Compress PDF",
  "csv-to-json": "CSV to JSON Converter",
  "image-compressor": "Image Compressor",
  "image-crop": "Image Cropper",
  "image-editor": "Online Image Editor",
  "image-filters": "Image Filters Tool",
  "image-resizer": "Image Resizer",
  "image-rotate": "Image Rotator",
  "image-to-pdf": "Image to PDF Converter",
  "image-watermark": "Image Watermarker",
  "jpg-to-png": "JPG to PNG Converter",
  "json-to-csv": "JSON to CSV Converter",
  "markdown-editor": "Markdown Editor",
  "merge-pdf": "Merge PDF",
  "pdf-to-image": "PDF to Image Converter",
  "pdf-to-text": "PDF to Text Extractor",
  "png-to-jpg": "PNG to JPG Converter",
  "remove-spaces": "Remove Extra Spaces",
  "rich-text-editor": "Rich Text Editor",
  "split-pdf": "Split PDF Pages",
  "text-case": "Text Case Converter",
  "word-counter": "Word Counter & Text Analyzer"
};

const excludes = ['index.html', 'about.html', 'contact.html', 'privacy.html', 'terms.html'];
const files = fs.readdirSync('.').filter(f => f.endsWith('.html') && !excludes.includes(f));
const sitemapUrls = ["https://docchangify.in/"];

files.forEach(file => {
  const toolSlug = file.replace('.html', '');
  if (!tools[toolSlug]) return;
  
  const toolName = tools[toolSlug];
  let content = fs.readFileSync(file, 'utf8');
  
  const newMeta = `    <title>${toolName} – Free Online Tool | DocChangify</title>
    <meta name="description" content="Use this ${toolName} instantly online with DocChangify. Free, fast processing, runs locally, and no signup required." />
    <link rel="canonical" href="https://docchangify.in/${toolSlug}" />
    <meta property="og:title" content="${toolName} – Free Online Tool" />
    <meta property="og:description" content="Use this ${toolName} instantly online with DocChangify. Free, fast processing, runs locally, and no signup required." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://docchangify.in/${toolSlug}" />`;

  // Remove existing title, description, and related link/meta tags
  content = content.replace(/<title>.*?<\/title>/gi, '');
  content = content.replace(/<meta name="description".*?>/gi, '');
  content = content.replace(/<link rel="canonical".*?>/gi, '');
  content = content.replace(/<meta property="og:.*?>/gi, '');
  
  // Inject new tags near </head> avoiding messy spaces
  content = content.replace('</head>', `${newMeta}\n  </head>`);
  
  const bodySeo = `      <!-- SEO Structured Content -->
      <section class="prose dark:prose-invert max-w-none mt-16 mb-16 mx-auto w-full">
        <h1 class="text-3xl font-extrabold mb-4 text-slate-900 dark:text-white">${toolName}</h1>
        <p class="text-lg text-slate-600 dark:text-slate-400 mb-8">
          Welcome to the best free online ${toolName}. DocChangify allows you to easily process, convert, and format your files or text instantly, directly from your browser without ever uploading data to a server.
        </p>

        <h2 class="text-2xl font-bold mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">How to use</h2>
        <ol class="list-decimal pl-6 space-y-2 mb-8 text-slate-700 dark:text-slate-300">
          <li>Upload your file or paste your input into the tool interface above.</li>
          <li>Adjust any settings or wait for the automatic processing to complete.</li>
          <li>Click the download or copy button to get your processed result.</li>
        </ol>

        <h2 class="text-2xl font-bold mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Features</h2>
        <ul class="list-disc pl-6 space-y-2 mb-8 text-slate-700 dark:text-slate-300">
          <li><strong>Lightning Fast Processing:</strong> Operates locally on your device's memory.</li>
          <li><strong>100% Secure & Private:</strong> Zero files are uploaded to our servers.</li>
          <li><strong>No Signup Required:</strong> Unlimited usage, totally free without an account.</li>
        </ul>

        <div class="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm mt-8">
          <h2 class="text-2xl font-bold mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">FAQ</h2>
          <div class="space-y-6">
            <div>
              <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Are my files safe? Does this upload to a server?</h3>
              <p class="text-slate-600 dark:text-slate-400 text-sm">Yes, this application is completely "Client-Side" - meaning the file conversion happens inside your own computer processor and browser memory. No files are ever sent over the internet.</p>
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Is the ${toolName} completely free?</h3>
              <p class="text-slate-600 dark:text-slate-400 text-sm">Absolutely. DocChangify believes in open access to utility tools. We don't ask for premium subscriptions, credit cards, or your email address.</p>
            </div>
          </div>
        </div>
      </section>`;

  if (content.includes('<!-- SEO Instructions & Info -->') && content.includes('<!-- Related Tools -->')) {
     const parts = content.split('<!-- SEO Instructions & Info -->');
     const before = parts[0];
     const afterSeo = parts[1];
     if (afterSeo.includes('<!-- Related Tools -->')) {
        const parts2 = afterSeo.split('<!-- Related Tools -->');
        const after = parts2.slice(1).join('<!-- Related Tools -->');
        content = before + bodySeo + "\\n\\n      <!-- Related Tools -->" + after;
     } else {
        content = before + bodySeo + "\\n\\n      " + afterSeo;
     }
  } else if (content.includes('<!-- Related Tools -->')) {
     content = content.replace('<!-- Related Tools -->', bodySeo + "\\n\\n      <!-- Related Tools -->");
  } else if (content.includes('</main>')) {
     content = content.replace('</main>', bodySeo + "\\n    </main>");
  } else {
     content = content.replace('</body>', bodySeo + "\\n  </body>");
  }

  // Ensure newlines/indenting don't stack continuously
  content = content.replace(/\\n\\n\\n+/g, "\\n\\n");
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Processed SEO for: ' + file);
  sitemapUrls.push(`https://docchangify.in/${toolSlug}`);
});

let sitemapTemplate = '<?xml version="1.0" encoding="UTF-8"?>\\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n';
sitemapUrls.forEach(url => {
  sitemapTemplate += `  <url>\\n    <loc>${url}</loc>\\n    <changefreq>weekly</changefreq>\\n    <priority>${url === 'https://docchangify.in/' ? '1.0' : '0.8'}</priority>\\n  </url>\\n`;
});
sitemapTemplate += `</urlset>`;

fs.writeFileSync('public/sitemap.xml', sitemapTemplate, 'utf8');
console.log('Rebuilt sitemap.xml');
