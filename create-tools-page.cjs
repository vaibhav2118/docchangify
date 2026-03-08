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

// We grab the header/footer from about.html and inject our content
let template = fs.readFileSync('about.html', 'utf8');

// Replace standard SEO
template = template.replace(/<title>.*?<\/title>/gi, '<title>All Free Online Tools - Docchangify</title>');
template = template.replace(/<meta name="description".*?>/gi, '<meta name="description" content="Explore all free tools available on Docchangify including image converters, PDF tools, text tools, and file utilities." />');
template = template.replace(/<link rel="canonical".*?>/gi, '<link rel="canonical" href="https://docchangify.in/tools" />');
template = template.replace(/<meta property="og:title".*?>/gi, '<meta property="og:title" content="All Free Online Tools - Docchangify" />');
template = template.replace(/<meta property="og:description".*?>/gi, '<meta property="og:description" content="Explore all free tools available on Docchangify including image converters, PDF tools, text tools, and file utilities." />');
template = template.replace(/<meta property="og:url".*?>/gi, '<meta property="og:url" content="https://docchangify.in/tools" />');

// Remove main content from about page
const mainStart = template.indexOf('<main');
const mainEnd = template.indexOf('</main>') + 7;
const beforeMain = template.substring(0, mainStart);
const afterMain = template.substring(mainEnd);

let toolListings = '';
Object.entries(tools).sort().forEach(([slug, name]) => {
  toolListings += `
            <a href="/${slug}" class="saas-card p-4 flex items-center justify-between group">
              <span class="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">${name}</span>
              <div class="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                <i class="ph ph-arrow-right"></i>
              </div>
            </a>`;
});

const toolsBody = `
    <main class="flex-grow fade-in pb-24">
      <!-- Page Header -->
      <section class="mt-12 mb-16 text-center px-4">
        <h1 class="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">All Free Online Tools - Docchangify</h1>
        <p class="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Explore all free tools available on Docchangify including image converters, PDF tools, text tools, and file utilities.
        </p>
      </section>

      <!-- Tools Directory -->
      <section class="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
${toolListings}
          </div>
        </div>
      </section>
    </main>
`;

fs.writeFileSync('tools.html', beforeMain + toolsBody + afterMain, 'utf8');
console.log('Created tools.html');

// Append to sitemap
let sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');
if (!sitemap.includes('/tools</loc>')) {
  sitemap = sitemap.replace('</urlset>', `  <url>\n    <loc>https://docchangify.in/tools</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n</urlset>`);
  fs.writeFileSync('public/sitemap.xml', sitemap, 'utf8');
  console.log('Added /tools to sitemap.xml');
}
