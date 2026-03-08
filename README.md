<div align="center">
  
# ✨ DocChangify

**A premium suite of free, fast, and secure frontend-only file converters and developer tools.**

![DocChangify Light Theme Demo](https://img.shields.io/badge/UI-Glassmorphic-6366f1?style=for-the-badge&logo=css3)
![Client-Side Architecture](https://img.shields.io/badge/Architecture-100%25%20Client--Side-10b981?style=for-the-badge&logo=javascript)
![Vite Build](https://img.shields.io/badge/Build-Vite.js-646cff?style=for-the-badge&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8?style=for-the-badge&logo=tailwindcss)

<p align="center">
  Convert anything, in seconds. Everything runs locally in your browser for maximum speed and absolute privacy.
</p>

</div>

---

## 🚀 Features & Tools

DocChangify is packed with **17 specialized tools**, carefully categorized to optimize your productivity. Each tool works entirely inside your browser, meaning **no files are ever uploaded or saved to a server**.

### 🖼️ Image Tools

- **PNG to JPG Converter:** Instantly compress transparent PNGs into standard JPGs.
- **JPG to PNG Converter:** Convert your photographs or graphics into a transparency-ready format.
- **Image Compressor:** Shrink heavy image files aggressively while retaining visual quality.
- **Image Resizer:** Exactly adjust the literal pixel dimensions of an image, with smart aspect-ratio locking.

### ✂️ Editing Tools

- **Image Editor:** An all-in-one studio to crop, apply filters, rotate, flip, draw, and watermark your photos.

### 📄 PDF Tools

- **PDF to Text:** Extract unformatted raw text data out of heavy PDF files.
- **Merge PDF:** Combine multiple PDF pages and files into a single master document.
- **Split PDF:** Strip exactly the page ranges you need from a large PDF.
- **PDF to Image:** Export every page of a PDF document as high-resolution PNGs.
- **Image to PDF:** Compile multiple scattered images into a unified, shareable PDF.
- **Compress PDF:** Re-compress heavy PDFs to shrink their storage footprint.

### 💻 Developer Tools

- **JSON to CSV:** Flatten complex JSON arrays to spreadsheet-ready commas.
- **CSV to JSON:** Parse tabular data sheets back into nested JSON objects.
- **Base64 Encoder/Decoder:** Safely format strings or files into portable Base64 algorithms.

### 📝 Text Tools

- **Word Counter:** Detailed statistics including characters, spaces, paragraphs, and reading time.
- **Remove Extra Spaces:** A powerful regex-cleaner that strips errant tabs, spaces, and formatting flaws.
- **Text Case Converter:** One-click conversion between UPPERCASE, lowercase, Title Case, and Sentence case.

---

## 🎨 Premium UI/UX Design

DocChangify is built with an obsessive focus on design and user experience:

- **Deep Obsidian Dark Mode:** A striking, true-black mode with dynamic neon accent glows based on category colors.
- **Zero FOUC Architecture:** Hard-linked stylesheets ensure perfectly seamless, instant page transitions with zero unstyled HTML flashing.
- **Interactive Fluidity:** Glassmorphic backdrops, smooth scale mechanics, and custom animations.
- **Responsive:** Tailored interface scaling flawless across desktop, tablet, and mobile displays.

---

## 🛠️ Architecture & Tech Stack

DocChangify runs natively in your browser using modern Web APIs. By avoiding server-side computations, we achieve instant conversions and guarantee user privacy.

- **Vite:** Lightning-fast frontend build tooling and local dev server.
- **HTML5 / Vanilla JavaScript:** Core app logic leveraging the Canvas API, modern DOM manipulation, and native APIs.
- **Tailwind CSS:** Comprehensive utility-first styling with custom configurations.
- **PDF.js & PDF-Lib:** Industry-standard libraries implemented natively on the client-side to rip, tear, merge, and construct PDFs.
- **Phosphor Icons:** Lightweight, highly consistent iconography suite.

---

## 📦 Getting Started (Local Development)

To run DocChangify locally on your machine, ensure you have [Node.js](https://nodejs.org/) installed, then follow these steps:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/docchangify.git
   cd docchangify
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

   _The server will typically start at `http://localhost:5173`. Open this URL in your browser._

4. **Build for production:**
   ```bash
   npm run build
   ```
   _The optimized static assets will be output to the `/dist` directory, ready to be deployed to Vercel, Netlify, GitHub Pages, or any static host._

---

## 🛡️ Privacy & Security First

DocChangify is fundamentally safe. The core architecture uses the HTML5 `FileReader` and `Canvas` APIs. When you click or drag a file into an application drop-zone, the file is strictly passed into your browser's local memory footprint. **It never touches a network. We have no databases, no cloud storage, and no backend APIs processing your sensitive media.**

---

<div align="center">
  <p>&copy; 2026 DocChangify. Designed for speed, built for everyone.</p>
</div>
