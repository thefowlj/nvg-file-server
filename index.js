// NVG File server
// A very simple Node JS file server system to lazily transfer files around
// a local network without using FTP or other similar protocols / systems.
//
// Author: Jon Fowler
//
// index.js

const express = require('express');
const formidable = require('formidable');
const fs = require('fs');
const server = express();
const path = require('path');

require('dotenv').config();

const FILE_SIZE_CONSTANT = 1024 * 1024;
const MAX_FILE_SIZE_MB = 4096;
const MAX_FILE_SIZE = FILE_SIZE_CONSTANT * MAX_FILE_SIZE_MB;
const FILE_DIR = process.env.FILE_DIR;

// Create storage directory if it does not exist on startup
try {
  if (!fs.existsSync(FILE_DIR)) {
    fs.mkdirSync(FILE_DIR);
  }
} catch (err) {
  console.log(err);
}

// GET landing page
server.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'file-server.html'));
});

// POST file for upload
server.post('/api/upload', (req, res) => {
  const form = formidable({ maxFileSize: MAX_FILE_SIZE });
  form.parse(req, (err, fields, files) => {
    fs.rename(files.filetoupload.path, FILE_DIR + files.filetoupload.name, (err) => {
      if (err) throw err;
      res.sendStatus(200);
    });
  });
});

// Listen for connections
server.listen(process.env.PORT, () => {
  console.log(`file servering listening on port ${process.env.PORT}`);
});
