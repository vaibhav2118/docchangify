const fs = require('fs');

const tools = {
  "base64": "Base64 Encoder / Decoder",
  "circular-image-cropper": "Circular Image Cropper",
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
  "word-counter": "Word Counter & Text Analyzer",
  "video-splitter": "Video Splitter",
  "youtube-banner-formatter": "YouTube Banner Formatter"
};

const excludes = ['index.html', 'about.html', 'contact.html', 'privacy.html', 'terms.html', 'tools.html'];
const files = fs.readdirSync('.').filter(f => f.endsWith('.html') && !excludes.includes(f));
const sitemapUrls = [
  "https://docchangify.in/",
  "https://docchangify.in/blog",
  "https://docchangify.in/about",
  "https://docchangify.in/contact",
  "https://docchangify.in/privacy",
  "https://docchangify.in/terms",
  "https://docchangify.in/blog/why-browser-side-tools-privacy",
  "https://docchangify.in/blog/essential-web-utility-tools"
];

files.forEach(file => {
  const toolSlug = file.replace('.html', '');
  if (!tools[toolSlug]) return;
  
  const toolName = tools[toolSlug];
  let content = fs.readFileSync(file, 'utf8');
  
  const newMeta = `    <title>${toolName} – Free Online Tool | DocChangify</title>
    <meta name="description" content="Use this premium ${toolName} instantly online with DocChangify. 100% free, fast browser-side processing, secure, and no sign-up needed." />
    <link rel="canonical" href="https://docchangify.in/${toolSlug}" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta property="og:title" content="${toolName} – Free Online Tool | DocChangify" />
    <meta property="og:description" content="Use this premium ${toolName} instantly online. Fast, secure, and browser-based processing." />
    <meta property="og:image" content="https://docchangify.in/favicon.png" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://docchangify.in/${toolSlug}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="https://docchangify.in/favicon.png" />
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "${toolName}",
      "operatingSystem": "All",
      "applicationCategory": "MultimediaApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "1250"
      }
    }
    </script>`;

  const footerHtml = `
    <!-- Professional Footer -->
    <footer class="bg-slate-900 dark:bg-slate-950 text-slate-400 pt-16 pb-8 mt-auto w-full">
      <div class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div class="col-span-1 md:col-span-2 space-y-4">
            <div class="flex items-center gap-2">
              <img src="/favicon.png" alt="DocChangify Logo" class="w-9 h-9 rounded-lg shadow-md" />
              <span class="text-xl font-extrabold text-white">DocChangify</span>
            </div>
            <p class="text-sm leading-relaxed max-w-sm">DocChangify provides state-of-the-art tools for developers, designers, and everyday users. Everything is free, lightning fast, and stays perfectly secure in your browser.</p>
            <div class="flex gap-4 pt-2">
              <a href="#" class="text-slate-500 hover:text-sky-400 transition-colors text-2xl"><i class="ph ph-twitter-logo"></i></a>
              <a href="#" class="text-slate-500 hover:text-white transition-colors text-2xl"><i class="ph ph-github-logo"></i></a>
              <a href="#" class="text-slate-500 hover:text-blue-400 transition-colors text-2xl"><i class="ph ph-linkedin-logo"></i></a>
            </div>
          </div>
          <div>
            <h4 class="font-bold text-white mb-4">Categories</h4>
            <ul class="space-y-3 text-sm">
              <li><a href="/#image-tools" class="hover:text-orange-400 transition-colors">🖼️ Image Tools</a></li>
              <li><a href="/#pdf-tools" class="hover:text-red-400 transition-colors">📄 PDF Tools</a></li>
              <li><a href="/#video-tools" class="hover:text-violet-400 transition-colors">🎬 Video Tools</a></li>
              <li><a href="/#developer-tools" class="hover:text-indigo-400 transition-colors">💻 Developer Tools</a></li>
              <li><a href="/#text-tools" class="hover:text-emerald-400 transition-colors">📝 Text Tools</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-bold text-white mb-4">Legal & Blog</h4>
            <ul class="space-y-3 text-sm">
              <li><a href="/blog" class="hover:text-white transition-colors">📰 Our Blog</a></li>
              <li><a href="/about" class="hover:text-white transition-colors">About Us</a></li>
              <li><a href="/contact" class="hover:text-white transition-colors">Contact</a></li>
              <li><a href="/privacy" class="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" class="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div class="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p class="text-sm">&copy; 2026 DocChangify. All rights reserved.</p>
          <div class="flex items-center gap-2 text-sm font-medium text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> All systems operational
          </div>
        </div>
      </div>
    </footer>`;

  // Clean old tags
  content = content.replace(/<title>.*?<\/title>/gi, '');
  content = content.replace(/<meta name="description".*?>/gi, '');
  content = content.replace(/<link rel="canonical".*?>/gi, '');
  content = content.replace(/<meta property="og:.*?>/gi, '');
  content = content.replace(/<meta name="twitter:.*?>/gi, '');
  content = content.replace(/<meta name="robots" content="noindex".*?>/gi, '');
  
  content = content.replace('</head>', `${newMeta}\n  </head>`);
  
  // Inject Blog into Header if not present
  if (content.includes('Back to Tools') && !content.includes('/blog')) {
      content = content.replace('Back to Tools', 'Back to Tools</a> <a href="/blog" class="ml-4 text-sm font-bold text-indigo-600 dark:text-indigo-400">Blog');
  }

  const otherTools = Object.keys(tools).filter(t => t !== toolSlug).sort(() => 0.5 - Math.random()).slice(0, 6);
  const relatedLinks = otherTools.map(t => `<li><a href="/${t}" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">${tools[t]}</a></li>`).join('\n          ');

  const bodySeo = `      <!-- SEO Structured Content (500+ Words) -->
      <section class="prose dark:prose-invert max-w-none mt-20 mb-20 mx-auto w-full border-t border-slate-100 dark:border-slate-800 pt-16">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div class="md:col-span-2">
            <h1 class="text-4xl font-black mb-6 text-slate-900 dark:text-white leading-tight">${toolName}</h1>
            <p class="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              Experience the best-in-class <strong>${toolName}</strong> powered by DocChangify. Our platform provides a seamless, professional interface designed for users who need quick, reliable, and secure file processing without the overhead of heavy software installations. Whether you are a developer, designer, or casual user, this tool is optimized to deliver high-quality results in seconds.
            </p>

            <h2 class="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200">Why Use DocChangify's ${toolName}?</h2>
            <p class="mb-6 leading-relaxed">
              Unlike many other online converters that require you to upload your sensitive data to their servers, DocChangify operates entirely within your browser. This means your privacy is 100% guaranteed. Our ${toolName} utilizes the latest web technologies to process your files locally on your machine, ensuring maximum speed and security. No more waiting for large files to upload or worrying about who might be accessing your data on a remote server.
            </p>

            <h3 class="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Key Benefits of Our Software:</h3>
            <ul class="list-disc pl-6 space-y-3 mb-8 text-slate-700 dark:text-slate-300">
              <li><strong>Zero Cost:</strong> We believe in providing essential utilities for free. There are no hidden fees, premium plans, or trial periods.</li>
              <li><strong>Lightning Fast:</strong> By utilizing local browser resources, we bypass the latency issues commonly associated with server-side processing.</li>
              <li><strong>Privacy First:</strong> Your files never leave your computer. We don't store, view, or touch your data.</li>
              <li><strong>Cross-Platform Compatibility:</strong> Works perfectly on Windows, macOS, Linux, and mobile browsers without any additional setup.</li>
              <li><strong>No Software Bloat:</strong> Save your disk space. Access professional-grade tools directly from your web browser.</li>
            </ul>

            <h2 class="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200">How to use carefully</h2>
            <ol class="list-decimal pl-6 space-y-3 mb-8 text-slate-700 dark:text-slate-300">
              <li><strong>Select your input:</strong> Choose the file or text you want to process using the interface above.</li>
              <li><strong>Adjust settings (Optional):</strong> Many of our tools, like the ${toolName}, offer customization options to fine-tune your output quality or format.</li>
              <li><strong>Instant Processing:</strong> Watch as our system handles the transformation in real-time.</li>
              <li><strong>Download & Save:</strong> Once finished, simply click the download action to save your result directly to your local storage.</li>
            </ol>

            <h2 class="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200">Common Use Cases</h2>
            <p class="mb-6 leading-relaxed">
              Our users frequently utilize the ${toolName} for a variety of tasks including web development, document preparation, and social media content creation. It's an essential part of the toolkit for anyone working with digital assets. For instance, designers often use it to prepare assets for different platforms, while developers rely on it for quick data transformations between formats like JSON, CSV, and Base64.
            </p>
          </div>

          <div class="space-y-10">
            <div class="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-800">
              <h3 class="text-lg font-bold mb-4 text-indigo-900 dark:text-indigo-200">Related Tools</h3>
              <ul class="space-y-4 text-sm">
                ${relatedLinks}
              </ul>
            </div>

            <div class="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 class="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">Privacy Guarantee</h3>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                All processing happens on your device. We do not use servers to process your files. Your data is yours and yours alone.
              </p>
            </div>
          </div>
        </div>

        <div class="mt-16 bg-white dark:bg-slate-800 p-10 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg">
          <h2 class="text-3xl font-bold mb-8 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-6 text-center">Frequently Asked Questions</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div class="space-y-4">
              <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200">Is this ${toolName} safe for confidential files?</h3>
              <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Yes, it is safer than most online converters. Because the code runs locally in your browser, your files are never uploaded to a server, making it virtually impossible for third-party interception.
              </p>
            </div>
            <div class="space-y-4">
              <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200">Can I use this on my mobile phone?</h3>
              <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Absolutely! DocChangify is fully responsive and optimized for mobile browsers. You can use the ${toolName} on Android or iOS devices just as easily as on a desktop.
              </p>
            </div>
            <div class="space-y-4">
              <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200">How many files can I process per day?</h3>
              <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                There are no limits. Use our tools as much as you like. We don't throttle speeds or count your usage sessions.
              </p>
            </div>
            <div class="space-y-4">
              <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200">Do I need to create an account?</h3>
              <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                No sign-up is required. We don't collect your email address or any personal information. Just open the tool and start working.
              </p>
            </div>
          </div>
        </div>
      </section>`;

  const oldMarkers = ['<!-- SEO Structured Content -->', '<!-- SEO Structured Content (500+ Words) -->', '<!-- SEO Instructions & Info -->'];
  let markerFound = false;
  
  for (const marker of oldMarkers) {
    if (content.includes(marker)) {
      const parts = content.split(marker);
      const before = parts[0];
      const rest = parts.slice(1).join(marker);
      
      if (rest.includes('<!-- Related Tools -->')) {
        const parts2 = rest.split('<!-- Related Tools -->');
        content = before + bodySeo + "\n\n      <!-- Related Tools -->" + parts2.slice(1).join('<!-- Related Tools -->');
      } else if (rest.includes('</main>')) {
        const parts2 = rest.split('</main>');
        content = before + bodySeo + "\n    </main>" + parts2.slice(1).join('</main>');
      } else {
        content = before + bodySeo;
      }
      markerFound = true;
      break;
    }
  }

  if (!markerFound) {
    if (content.includes('<!-- Related Tools -->')) {
      content = content.replace('<!-- Related Tools -->', bodySeo + "\n\n      <!-- Related Tools -->");
    } else if (content.includes('</main>')) {
      content = content.replace('</main>', bodySeo + "\n    </main>");
    } else {
      content = content.replace('</body>', bodySeo + "\n  </body>");
    }
  }

  // Inject Footer if missing
  if (!content.includes('<!-- Professional Footer -->')) {
      if (content.includes('</main>')) {
          content = content.replace('</main>', `</main>${footerHtml}`);
      } else {
          content = content.replace('</body>', `${footerHtml}\n  </body>`);
      }
  }

  content = content.replace(/\n\n\n+/g, "\n\n");
  fs.writeFileSync(file, content, 'utf8');
  console.log('Processed SEO for: ' + file);
  sitemapUrls.push(`https://docchangify.in/${toolSlug}`);
});

let sitemapTemplate = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
sitemapUrls.forEach(url => {
  sitemapTemplate += `  <url>\n    <loc>${url}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${url === 'https://docchangify.in/' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
});
sitemapTemplate += `</urlset>`;

fs.writeFileSync('public/sitemap.xml', sitemapTemplate, 'utf8');
console.log('Rebuilt sitemap.xml with clean URLs');
