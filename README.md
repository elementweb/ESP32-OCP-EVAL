# ESP32-OCP-EVAL

Serial port tinker

## Installation

Clone repository and run:

```sh
npm install
```

## Usage

```sh
main.js [com-port] [command] [arguments]
```

Examples:

```sh
node main.js COM5 message
node main.js COM5 listen
node main.js COM5 send <filename>
node main.js COM5 receive
```
