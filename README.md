# Web Hosting Platform

A simple web hosting platform that supports HTML, CSS, JavaScript, and PHP projects. Upload your web projects and get them hosted instantly on a subdomain.

## Features

- Drag and drop file/folder upload
- Support for HTML, CSS, JS, and PHP files
- Automatic subdomain creation based on project name
- Modern and responsive UI
- Real-time upload status
- PHP execution support

## Prerequisites

- Node.js (v14 or higher)
- PHP installed and available in system PATH
- npm (Node Package Manager)

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Drag and drop your project folder/files or click "Browse Files" to select them
3. Your project will be uploaded and hosted automatically
4. Access your site at `http://[project-name].localhost:3000`

## Supported File Types

- HTML files
- CSS files
- JavaScript files
- PHP files
- ZIP archives containing web projects

## Notes

- Make sure PHP is installed and properly configured if you want to host PHP projects
- For local development, you'll need to add your subdomains to your hosts file or use a local DNS server
- Maximum upload size is 50MB
