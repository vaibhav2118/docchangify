const fs = require('fs');
const path = require('path');

const directoryPath = '.'; // Current directory

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }
    
    files.forEach((file) => {
        if (path.extname(file) === '.html') {
            const filePath = path.join(directoryPath, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Match href="/something.html" and change to href="/something"
            // Also handle href="./something.html"
            const updatedContent = content.replace(/href="(\.?\/[^"]+)\.html"/g, 'href="$1"');
            
            if (content !== updatedContent) {
                fs.writeFileSync(filePath, updatedContent, 'utf8');
                console.log(`Updated links in: ${file}`);
            }
        }
    });
});
