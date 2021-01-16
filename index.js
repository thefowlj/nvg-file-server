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
const TEMP_DIR = process.env.TEMP_DIR;

// Create storage directorIES if it does not exist on startup
checkStorage(FILE_DIR);
checkStorage(TEMP_DIR);

// Create directories at specific path
function checkStorage(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  } catch (err) {
    console.log(err);
  }
}

// GET landing page
server.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'file-server.html'));
});

// GET list of files
server.get('/api/files', (req, res) => {
  let output = { route: 'api/file/', delete: 'api/file/delete/'};
  fs.readdir(FILE_DIR, (err, files) => {
    output.files = files;
    res.json(output);
  });
});

// GET specific file
server.get('/api/file/:filename', (req, res) => {
  res.sendFile(FILE_DIR + req.params.filename, { root: '.' });
});

// GET request to delete specific file
server.get('/api/file/delete/:filename', (req, res) => {
  fs.unlink(FILE_DIR + req.params.filename, (err) => {
    if (err) {
      console.log(err);
    }
    res.redirect('/');
  });
});

// POST file for upload
server.post('/api/upload', (req, res) => {
  addFile(req, res, FILE_DIR, '/');
});

// GET temp upload html page
server.get('/temp', (req, res) => {
  res.sendFile(path.join(__dirname, 'temp.html'));
});

// GET shortcut route redirect to /temp
server.get('/t', (req, res) => {
  res.redirect('/temp');
});

// GET shortcut route to download temp file
server.get('/td', (req, res) => {
  fs.readdir(TEMP_DIR, (err, files) => {
    if (files.length > 0) {
      res.redirect(`/api/temp/file/${files[0]}`)
    } else {
      res.redirect('/temp');
    }
  });
})

// GET file in temp directory
server.get('/api/temp/file/:filename', (req, res) => {
  res.sendFile(TEMP_DIR + req.params.filename, { root: '.' });
});

// GET list of temp files
server.get('/api/temp/files', (req, res) => {
  let output = { route: 'api/temp/file/', delete: 'api/temp/clear/'};
  fs.readdir(TEMP_DIR, (err, files) => {
    output.files = files;
    res.json(output);
  });
});

// POST temp file for upload
// removes previous temp file(s)
server.post('/api/temp/upload', (req, res) => {
  fs.readdir(TEMP_DIR, (err, files) => {
    files.forEach((value) => {
      fs.unlink(TEMP_DIR + value, (err) => {
        if (err) {
          console.log(err);
        }
      });
    });
  });
  addFile(req, res, TEMP_DIR, '/temp');
});

// Add files posted in request to specified directory
function addFile(req, res, dir, redirect) {
  redirect = redirect != undefined ? redirect : '/';
  const form = formidable({ maxFileSize: MAX_FILE_SIZE });
  form.parse(req, (err, fields, files) => {
    fs.rename(files.filetoupload.path, dir + files.filetoupload.name, (err) => {
      if (err) throw err;
      res.redirect(redirect);
    });
  });
}

// Listen for connections
server.listen(process.env.PORT, () => {
  console.log(`file servering listening on port ${process.env.PORT}`);
});
