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
const path = require('path');
const server = express();
const http = require('http').createServer(server);
const io = require('socket.io')(http);
const mv = require('mv');
const os = require('os');

require('dotenv').config();

const FILE_SIZE_CONSTANT = 1024 * 1024;
const MAX_FILE_SIZE_MB =
  process.env.MAX_FILE_SIZE != undefined ?
  process.env.MAX_FILE_SIZE : 4096;
const MAX_FILE_SIZE = FILE_SIZE_CONSTANT * MAX_FILE_SIZE_MB;
const FILE_DIR =
  process.env.FILE_DIR != undefined ?
  process.env.FILE_DIR : './files/';
const TEMP_DIR =
  process.env.TEMP_DIR != undefined ?
  process.env.TEMP_DIR : './temp/';
const EMIT_WAIT =
  process.env.EMIT_WAIT != undefined ?
  process.env.EMIT_WAIT : 1000;
const UPLOAD_DIR =
  process.env.UPLOAD_DIR != undefined ?
  process.env.UPLOAD_DIR : os.tmpdir();

// Create storage directorIES if it does not exist on startup
checkStorage(FILE_DIR);
checkStorage(TEMP_DIR);
checkStorage(UPLOAD_DIR);

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
  let root = FILE_DIR.charAt(0);
  res.sendFile(FILE_DIR + req.params.filename, { root: root });
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
  let id = req.query.clientId;
  addFile(req, res, FILE_DIR, '/', id);
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
  let root = FILE_DIR.charAt(0);
  res.sendFile(TEMP_DIR + req.params.filename, { root: root });
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
  let id = req.query.clientId;
  fs.readdir(TEMP_DIR, (err, files) => {
    files.forEach((value) => {
      fs.unlink(TEMP_DIR + value, (err) => {
        if (err) {
          console.log(err);
        }
      });
    });
  });
  addFile(req, res, TEMP_DIR, '/temp', id);
});

// Add files posted in request to specified directory
function addFile(req, res, dir, redirect, clientId) {
  redirect = redirect != undefined ? redirect : '/';
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE,
    uploadDir: UPLOAD_DIR
   });
  let start = Date.now();
  let output = { start: start, bytesReceived: 0, bytesExpected: 1 };
  const emitProgress = async function () {
    let value = (output.bytesReceived * 100) / output.bytesExpected;
    console.log(value);
    io.to(clientId).emit('uploadProgress', output);
    if (value != 100) { setTimeout(() => { emitProgress(); }, EMIT_WAIT); }
  };
  emitProgress();
  form.on('progress', (bytesReceived, bytesExpected) => {
    output.bytesReceived = bytesReceived;
    output.bytesExpected = bytesExpected;
    if (bytesReceived == bytesExpected) {
      io.to(clientId).emit('uploadProgress', output);
    }
  });
  form.parse(req, (err, fields, files) => {
    mv(files.filetoupload.path, dir + files.filetoupload.name, (err) => {
      if (err) throw err;
      res.redirect(redirect);
    });
  });
}

io.on('connection', (socket) => {
  console.log(socket.id);
});

// Listen for connections
http.listen(process.env.PORT, () => {
  console.log(`file servering listening on port ${process.env.PORT}`)
});
