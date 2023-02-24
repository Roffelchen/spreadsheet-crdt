## Node versions

Verified to work in:\
Node: 18.9.1

## Available Scripts

In the project directory, you can run:

### Running the project

`npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

`npx y-websocket-server`

Runs the websocket server with the default port 1234.

### First time setup/ missing packages

Run `npm i` to install the required packages.\
Should this fail, run `npm i --save` and should this still fail, run `npm i --save --legacy-peer-deps`

## Quirks

The way the `Websocket server` works, clearing the storage requires closing the server, closing all browser tabs connected to this websocket and opening them again.\
Alternatively, all but one tab can be closed and this one simply refreshed to produce the same effect.