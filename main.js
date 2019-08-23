const base64 = require('js-base64').Base64;
const SerialPort = require('serialport');
const base64file = require('file-base64');
const fs = require('fs');
const filepath = require('path');
const randomstring = require("randomstring");
const crypto = require('crypto');

let params = process.argv.slice(2);

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const primary = new SerialPort(params[0], { baudRate : 115200 });

if(params[1] == 'message') {
  let recursiveAsyncReadLine = function () {
    readline.question('> ', function (message) {
      primary.write('%');
      primary.write(message);
      primary.write('*');

      recursiveAsyncReadLine();
    });
  };

  recursiveAsyncReadLine();
}

if(params[1] == 'listen') {
  var buffer = '';
  var incoming_message = false;

  primary.on('data', function(data) {
    data = data.toString('utf8');

    if(data.indexOf('%') !== -1) {
      incoming_message = true;

      buffer += data.split("%").pop();

      return;
    }

    if(incoming_message) {
      if(data.indexOf('*') !== -1) {
        buffer += data.split("*")[0];
        
        process.stdout.write(buffer + '\n');

        buffer = '';

        return;
      }

      buffer += data.toString('utf8');
    }
  });
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
      primary.write('%');
      primary.write(Buffer.from(filename).toString('base64') + '$');
      primary.write(base64);
      primary.write('*');
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
        
        base64file.decode(filedata, './incoming/' + filename, function(err, output) {
          console.log(filename + ' received');
        });

        buffer = '';

        return;
      }

      buffer += data.toString('utf8');
    }
  });
}

if(params[1] == 'bytes') {
  let string = randomstring.generate(params[2]);
  
  primary.write(string);

  let hash = crypto.createHash('md5').update(string).digest("hex");

  console.log(hash);
}
