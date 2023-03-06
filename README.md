# Esotere Client
Esotere client is the gateway to the topology world.
Message directly with fellow wizards and roam a fantasy-themed overworld populated with artifacts from other on-chain realities.

## Table of Contents
- [Esotere Client](#esotere-client)
  - [Table of Contents](#table-of-contents)
  - [Stack](#stack)
  - [Installation](#installation)
  - [Usage](#usage)
  
# Stack
The client UI uses Electron to run the app natively on your desktop. Simple-peer is used to establish WebRTC connections between peers. Game engine, additional netcode and frontend frameworks are to be determined.

# Features
- [x] Text Chat
- [x] Voice chat
- [ ] Signalling
- [] Shared platformer world


# Installation
Pull the main branch of the repo
```
    cd client/client && yarn
```
then 
```
cd ../electron && yarn
```

# Usage
### The client can be ran in the <ins>browser</ins> or in <ins>electron</ins>


### &#128193; Browser
Inside **client** folder you can run Phaser with Typescript, Rollup and Vite but without Electron.

| Command | Description |
|---------|-------------|
| `yarn` or `npm install` | Install project dependencies |
| `yarn dev` or `npm run dev` | Builds project and open web server, watching for changes |
| `yarn build` or `npm run build` | Builds code bundle with production settings  |
| `yarn serve` or `npm run serve` | Run a web server to serve built code bundle |

### &#128193; Electron
Inside **electron** folder you can run Electron with Phaser! You can run in dev mode or production mode for the final preview and release. 

| Command | Description |
|---------|-------------|
| `yarn` | Install project dependencies |
| `yarn dev` | Builds project and open web server from client folder and Electron, **watching for changes** |
| `yarn preview` | Starts a preview for a final release  |
| `yarn build`| Build app with Electron |


## As an initiator
Once the app is loaded select a username and hit `submit`. 
Then click `+ initialize connection`. Copy the JSON string in `Your ID` and send this to the peer you are connecting to.
Past in the response JSON into `Other id` and select `connect`. Click `Done Connecting` and start chatting with your peer.

## As a responder
Once the app is loaded select a username and hit `submit`. 
Then click `+ Respond to Connection Request`. Copy the JSON string from your peer and paste this string into `Other ID`. Select `connect` and share the resulting `Your ID` with your peer. Click `Done Connecting` and start chatting with your peer.




Templates Used

https://github.com/waliente/phaser-typescript-electron
https://github.com/ourcade/sidescrolling-platformer-template-phaser3
phaser starknet boilerplate 

plugins
https://rexrainbow.github.io/phaser3-rex-notes/docs/site/ui-textbox/
