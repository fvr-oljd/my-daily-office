const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// --- Data Loading ---
// We load the full data once when the server starts.
let officeData, devotionalData;
try {
    officeData = JSON.parse(fs.readFileSync(path.join(__dirname, 'office.json'), 'utf8'));
    devotionalData = JSON.parse(fs.readFileSync(path.join(__dirname, 'devotional.json'), 'utf8'));
    console.log("Successfully loaded office and devotional data.");
} catch (error) {
    console.error("Fatal Error: Could not load office.json or devotional.json. Please ensure they are in the correct directory.", error);
    process.exit(1); // Exit if essential data is missing.
}

// --- Helper Function to Get Data for a Specific Date ---
function getInitialDataForDate(date) {
    const dayOfWeek = DAY_NAMES[date.getDay()];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateKey = `${month}-${day}`;

    const morningDevotional = devotionalData.find(d => d.date === dateKey && d.time === 'am');
    const eveningDevotional = devotionalData.find(d => d.date === dateKey && d.time === 'pm');
    
    // Create a minimal set of data needed for the initial render.
    return {
        devotional: [morningDevotional, eveningDevotional].filter(Boolean), // Filter out undefined if not found
        office: {
            dailyFocus: {
                [dayOfWeek]: officeData.dailyFocus[dayOfWeek]
            },
            collects: officeData.collects
        }
    };
}


// --- The Server Logic ---
const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
    }[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            // If it's the main index.html file, inject the initial data
            if (filePath === './index.html') {
                const today = new Date();
                const initialData = getInitialDataForDate(today);
                const initialDataString = JSON.stringify(initialData);

                // Replace the placeholder in the HTML content
                content = content.toString().replace(
                    '%%INITIAL_DATA%%',
                    initialDataString
                );
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log("Open this address in your web browser.");
});
