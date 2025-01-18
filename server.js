const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs-extra');
const extract = require('extract-zip');
const phpExpress = require('php-express')({
    binPath: 'php'
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max file size
    createParentPath: true,
    preserveExtension: true,
    safeFileNames: false,  // Do not modify file names at all
    debug: false
}));

// Sites directory where all hosted sites will be stored
const SITES_DIR = path.join(__dirname, 'sites');
fs.ensureDirSync(SITES_DIR);

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve the upload form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle folder uploads
app.post('/upload-folder', async (req, res) => {
    try {
        if (!req.files || !req.files['files[]']) {
            return res.status(400).json({ error: 'No files were uploaded.' });
        }

        // Get project name from the first file's path
        const files = Array.isArray(req.files['files[]']) ? req.files['files[]'] : [req.files['files[]']];
        const firstFile = files[0];
        const pathParts = firstFile.name.split('/');
        
        // Use the first directory name as project name, preserving original casing
        const projectName = pathParts[0]
            .replace(/[^a-zA-Z0-9-_]/g, '-')  // Only replace truly unsafe characters
            .toLowerCase();
        
        const projectPath = path.join(SITES_DIR, projectName);

        // Clean up project directory if it exists
        await fs.remove(projectPath);
        await fs.ensureDir(projectPath);

        // Process each file
        for (const file of files) {
            try {
                // Preserve the entire original path
                const relativePath = file.name.substring(file.name.indexOf('/') + 1);
                const filePath = path.join(projectPath, relativePath);
                
                // Create the directory structure
                await fs.ensureDir(path.dirname(filePath));
                
                // Move the file with its original name
                await file.mv(filePath);
            } catch (err) {
                console.error(`Error processing file ${file.name}:`, err);
            }
        }

        res.json({
            success: true,
            message: 'Project uploaded successfully',
            url: `/sites/${projectName}`
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error processing upload: ' + error.message });
    }
});

// Handle single file/zip uploads
app.post('/upload', async (req, res) => {
    try {
        if (!req.files || !req.files.project) {
            return res.status(400).json({ error: 'No files were uploaded.' });
        }

        const uploadedFile = req.files.project;
        const fileName = uploadedFile.name;
        
        // Generate project name from first directory or file name
        const projectName = fileName.split('/')[0]
            .replace(/[^a-zA-Z0-9-_]/g, '-')
            .toLowerCase();
        
        const projectPath = path.join(SITES_DIR, projectName);

        // Clean up project directory if it exists
        await fs.remove(projectPath);
        await fs.ensureDir(projectPath);

        // Upload path
        const uploadPath = path.join(projectPath, fileName);

        // Ensure directory exists for the file
        await fs.ensureDir(path.dirname(uploadPath));

        // Move the file
        await uploadedFile.mv(uploadPath);

        // If it's a zip file, extract it
        if (path.extname(fileName).toLowerCase() === '.zip') {
            await extract(uploadPath, { dir: projectPath });
            await fs.unlink(uploadPath); // Remove the zip file after extraction
        }

        res.json({
            success: true,
            message: 'Project uploaded successfully',
            url: `/sites/${projectName}`
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error processing upload: ' + error.message });
    }
});

// Handle PHP files
app.engine('php', phpExpress.engine);
app.set('view engine', 'php');

// Serve PHP files from sites directory
app.all('/sites/:project/**/*.php', (req, res, next) => {
    const projectName = req.params.project;
    const projectPath = path.join(SITES_DIR, projectName);
    
    if (!fs.existsSync(projectPath)) {
        return res.status(404).send('Project not found');
    }
    
    app.set('views', projectPath);
    phpExpress.router(req, res, next);
});

// Serve static files from sites directory with proper index handling
app.use('/sites/:project', (req, res, next) => {
    const projectName = req.params.project;
    const projectPath = path.join(SITES_DIR, projectName);
    
    if (!fs.existsSync(projectPath)) {
        return res.status(404).send('Project not found');
    }
    
    express.static(projectPath, {
        index: ['index.html', 'index.php']
    })(req, res, next);
});

// List all hosted sites
app.get('/sites', async (req, res) => {
    try {
        const sites = await fs.readdir(SITES_DIR);
        const sitesList = await Promise.all(sites.map(async site => {
            const stats = await fs.stat(path.join(SITES_DIR, site));
            if (stats.isDirectory()) {
                return {
                    name: site,
                    url: `/sites/${site}`
                };
            }
            return null;
        }));

        const validSites = sitesList.filter(site => site !== null);
        
        res.send(`
            <html>
                <head>
                    <title>Hosted Sites</title>
                    <link rel="stylesheet" href="/public/style.css">
                </head>
                <body>
                    <div class="container">
                        <h1>Hosted Sites</h1>
                        <div class="sites-list">
                            ${validSites.map(site => `
                                <div class="site-item">
                                    <h3>${site.name}</h3>
                                    <a href="${site.url}" target="_blank">View Site</a>
                                </div>
                            `).join('')}
                        </div>
                        <p><a href="/" class="browse-btn">Upload New Site</a></p>
                    </div>
                </body>
            </html>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading sites list');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Main site: http://localhost:' + PORT);
    console.log('View hosted sites: http://localhost:' + PORT + '/sites');
});
