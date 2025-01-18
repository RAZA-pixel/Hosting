document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const zipInput = document.getElementById('zipInput');
    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('uploadStatus');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);

    // Handle file input change
    fileInput.addEventListener('change', handleFolderSelect, false);
    zipInput.addEventListener('change', handleZipSelect, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropZone.classList.add('dragover');
    }

    function unhighlight(e) {
        dropZone.classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const items = dt.items;

        if (items) {
            // Handle folder drop
            const item = items[0].webkitGetAsEntry();
            if (item && item.isDirectory) {
                handleFolderDrop(dt.items);
            } else {
                // Handle as zip file
                handleZipSelect({ target: { files: dt.files } });
            }
        }
    }

    async function handleFolderDrop(items) {
        uploadStatus.innerHTML = 'Processing folder...';
        uploadStatus.className = 'upload-status';
        uploadStatus.style.display = 'block';

        const files = [];
        let processedItems = 0;
        const totalItems = items.length;

        const readEntries = async (entry, path = '') => {
            if (entry.isFile) {
                const file = await new Promise((resolve) => {
                    entry.file(resolve);
                });
                // Add the full path to the file object
                file.fullPath = path + '/' + file.name;
                files.push(file);
                processedItems++;
                uploadStatus.innerHTML = `Processing files... ${processedItems}/${totalItems}`;
            } else if (entry.isDirectory) {
                const dirReader = entry.createReader();
                const entries = await new Promise((resolve) => {
                    dirReader.readEntries(resolve);
                });
                for (const childEntry of entries) {
                    await readEntries(childEntry, path + '/' + entry.name);
                }
            }
        };

        for (const item of items) {
            const entry = item.webkitGetAsEntry();
            if (entry) {
                await readEntries(entry);
            }
        }

        uploadFolder(files);
    }

    function handleFolderSelect(e) {
        const files = Array.from(e.target.files);
        uploadFolder(files);
    }

    function handleZipSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            uploadFiles(files[0]);
        }
    }

    function uploadFolder(files) {
        if (files.length === 0) {
            uploadStatus.innerHTML = 'No files selected';
            uploadStatus.className = 'upload-status error';
            return;
        }

        uploadStatus.innerHTML = 'Uploading files...';
        uploadStatus.className = 'upload-status';
        uploadStatus.style.display = 'block';

        const formData = new FormData();
        
        // Add each file to formData with its relative path
        files.forEach(file => {
            const relativePath = file.webkitRelativePath || file.fullPath || file.name;
            formData.append('files[]', file, relativePath);
        });

        fetch('/upload-folder', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                uploadStatus.innerHTML = `
                    Upload successful!<br>
                    Your site is available at: <a href="${window.location.origin}${data.url}" target="_blank">${window.location.origin}${data.url}</a><br>
                    <a href="/sites">View all hosted sites</a>
                `;
                uploadStatus.classList.add('success');
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        })
        .catch(error => {
            uploadStatus.innerHTML = `Error: ${error.message}`;
            uploadStatus.classList.add('error');
            console.error('Upload error:', error);
        });
    }

    function uploadFiles(file) {
        const formData = new FormData();
        formData.append('project', file);

        uploadStatus.innerHTML = 'Uploading...';
        uploadStatus.className = 'upload-status';
        uploadStatus.style.display = 'block';

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                uploadStatus.innerHTML = `
                    Upload successful!<br>
                    Your site is available at: <a href="${window.location.origin}${data.url}" target="_blank">${window.location.origin}${data.url}</a><br>
                    <a href="/sites">View all hosted sites</a>
                `;
                uploadStatus.classList.add('success');
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        })
        .catch(error => {
            uploadStatus.innerHTML = `Error: ${error.message}`;
            uploadStatus.classList.add('error');
            console.error('Upload error:', error);
        });
    }
});
