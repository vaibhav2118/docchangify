import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pngToJpg: resolve(__dirname, 'png-to-jpg.html'),
        jpgToPng: resolve(__dirname, 'jpg-to-png.html'),
        imageCompressor: resolve(__dirname, 'image-compressor.html'),
        imageResizer: resolve(__dirname, 'image-resizer.html'),
        jsonToCsv: resolve(__dirname, 'json-to-csv.html'),
        csvToJson: resolve(__dirname, 'csv-to-json.html'),
        base64: resolve(__dirname, 'base64.html'),
        wordCounter: resolve(__dirname, 'word-counter.html'),
        removeSpaces: resolve(__dirname, 'remove-spaces.html'),
        textCase: resolve(__dirname, 'text-case.html'),
        pdfToText: resolve(__dirname, 'pdf-to-text.html'),
        mergePdf: resolve(__dirname, 'merge-pdf.html'),
        splitPdf: resolve(__dirname, 'split-pdf.html'),
        pdfToImage: resolve(__dirname, 'pdf-to-image.html'),
        imageToPdf: resolve(__dirname, 'image-to-pdf.html'),
        compressPdf: resolve(__dirname, 'compress-pdf.html'),
        about: resolve(__dirname, 'about.html'),
        contact: resolve(__dirname, 'contact.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        imageCrop: resolve(__dirname, 'image-crop.html'),
        imageFilters: resolve(__dirname, 'image-filters.html'),
        imageWatermark: resolve(__dirname, 'image-watermark.html'),
        imageRotate: resolve(__dirname, 'image-rotate.html'),
        markdownEditor: resolve(__dirname, 'markdown-editor.html'),
        richTextEditor: resolve(__dirname, 'rich-text-editor.html'),
        imageEditor: resolve(__dirname, 'image-editor.html')
      }
    }
  }
})
