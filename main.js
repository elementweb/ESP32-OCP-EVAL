const base64 = require('js-base64').Base64;
const SerialPort = require('serialport');
const base64file = require('file-base64');
const fs = require('fs');
const filepath = require('path');
const randomstring = require("randomstring");
const md5File = require('md5-file');

let params = process.argv.slice(2);

const primary = new SerialPort(params[0], { baudRate : 460800 });

if(params[1] == 'message') {
  var readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  global.buffer = '';

  primary.on('data', function(data) {
    global.buffer += data.toString('utf8');

    if(global.buffer.indexOf('%') !== -1) {
      global.buffer = global.buffer.split("%").pop();
    }

    if(global.buffer.indexOf('*') !== -1) {
      global.buffer = global.buffer.split("*")[0];
      
      process.stdout.cursorTo(0);
      process.stdout.write('receive> ' + Buffer.from(global.buffer, 'base64').toString() + '\n');
      process.stdout.write('send> ');

      global.buffer = '';
    }
  });

  let recursiveAsyncReadLine = function () {
    readline.question('send> ', function (message) {
      primary.write('%');
      primary.write(Buffer.from(message).toString('base64'));
      primary.write('*');

      recursiveAsyncReadLine();
    });
  };

  recursiveAsyncReadLine();
}

if(params[1] == 'send') {
  let filename = params[2];
  let path = './outgoing/' + filename;

  fs.access(path, fs.F_OK, (err) => {
    if (err) {
      console.log('could not open input file');
      process.exit();
    }

    base64file.encode(path, function(err, base64) {
      file = Buffer.from(base64).toString();
      filename = Buffer.from(filename).toString('base64');

      buf = '%' + filename + '$' + file + '*';

      primary.write(Buffer.from(buf).toString());

      const hash = md5File.sync(path);
      console.log('md5: ' + hash);
    });
  })
}

if(params[1] == 'receive') {
  var buffer = '';
  var incoming_file = false;

  if (!fs.existsSync(incoming = './incoming')){
      fs.mkdirSync(incoming);
  }
  
  fs.readdir(incoming, (err, files) => {
    if (err) throw err;
    for (const file of files) {
      fs.unlink(filepath.join(incoming, file), err => {
        if (err) throw err;
      });
    }
  });

  primary.on('data', function(data) {
    data = data.toString('utf8');

    if(data.indexOf('%') !== -1) {
      incoming_file = true;

      buffer += data.split("%").pop();

      return;
    }

    if(incoming_file) {
      if(data.indexOf('*') !== -1) {
        buffer += data.split("*")[0];
        buffer = buffer.split('$');
        incoming_file = false;

        let filename = base64.decode(buffer[0]);
        let filedata = buffer.pop();
        let path = './incoming/' + filename;

        base64file.decode(filedata, path, function(err, output) {
          process.stdout.write(filename + ' received');
          setTimeout(function() {
            process.stdout.write(' (' + md5File.sync(path) + ')\n');
          }, 300);
        });

        buffer = '';

        return;
      }

      buffer += data.toString('utf8');
    }
  });
}

if(params[1] == 'bytes') {
  let string = randomstring.generate(parseInt(params[2]));
  
  primary.write(string);

  let hash = crypto.createHash('md5').update(string).digest("hex");

  console.log('data: ' + string);
  console.log('md5: ' + hash);
}
