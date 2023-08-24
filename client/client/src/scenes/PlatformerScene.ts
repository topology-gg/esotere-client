import Phaser from "phaser";
import ObstaclesController from "../controllers/ObstaclesController";
import PlayerController from "../controllers/PlayerController";
import type {
  Connection,
  PeerData,
  PeerMessage,
  State,
  platformerSceneData,
} from "./types";

import IText from "phaser3-rex-plugins/plugins/gameobjects/dom/inputtext/InputText";
import InputText from "phaser3-rex-plugins/plugins/inputtext.js";
import config from "../config";
import CharacterController from "../controllers/Controller";
import Whiteboard from "../gameObjects/whiteboard";
import CRDT, { CRDT_STATE } from "../networking/crdt";
import Media from "../networking/media";
import { MessageType } from "./enums";

interface ConnectedPlayer extends Connection {
  controller?: CharacterController;
}

export default class Platformer extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private penquin?: Phaser.Physics.Matter.Sprite;
  private playerController?: PlayerController;
  private obstacles!: ObstaclesController;

  private connectedPlayers: ConnectedPlayer[] = [];

  private lastPosBroadcast: number = 0;

  private chatBox: InputText;

  private username: string;

  private userMessages: PeerMessage[] = [];

  private whiteboard: Whiteboard;

  private crdt: CRDT;
  private media: Media;
  private peers: Map<number, CharacterController> = new Map();

  constructor() {
    super("platformer");
  }

  init(data: platformerSceneData) {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.obstacles = new ObstaclesController();

    this.connectedPlayers = data.peers;
    this.username = data.username;
    this.crdt = data.crdt;
    this.media = data.media;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy();
    });
  }

  initializePeers(data: Connection[]) {
    // on data handler from peer
    // send data to peer

    data.forEach((connection, index) => {
      let player = this.connectedPlayers[index];

      this.connectedPlayers[index].controller = this.initPeer(
        1005,
        490,
        player.username
      );

      connection.peer.on("data", (data: string) => {
        let parsed: PeerData = JSON.parse(data);
        if (parsed.type == MessageType.INPUT) {
          player.controller?.simulateInput(parsed.content);
        } else if (parsed.type == MessageType.POSITION) {
          player.controller?.moveSprite(parsed.content);
        } else if (parsed.type == MessageType.MESSAGE) {
          const message: PeerMessage = {
            content: parsed.content,
            timestamp: this.time.now,
          };

          player.controller?.chat(message);
          connection.messages.push(message);
        } else if (parsed.type == MessageType.WHITEBOARD) {
          this.whiteboard.setWhiteboardLink(parsed.content);
        }
      });
    });
  }

  preload() {
    this.load.atlas("penquin", "assets/penquin.png", "assets/penquin.json");
    this.load.image("tiles", "assets/sheet.png");
    this.load.tilemapTiledJSON("tilemap", "assets/game.json");

    this.load.image("star", "assets/star.png");
    this.load.image("health", "assets/health.png");

    this.load.atlas("snowman", "assets/snowman.png", "assets/snowman.json");

    this.load.image("mute", "assets/mute.png");
    this.load.image("unmute", "assets/unmute.png");
  }

  renderChatBox() {
    var inputTextConfig: IText.IConfig = {
      text: "",
      color: "black",
      border: 1,
      backgroundColor: "rgba(255,255,255,0.5)",
      placeholder: "Send messages here",
    };
    var inputText = new InputText(
      this,
      config.scale.width - 275,
      config.scale.height - 50,
      500,
      50,
      inputTextConfig
    );
    this.add.existing(inputText);

    inputText.setScrollFactor(0, 0);

    // Set our input text as a member object
    this.chatBox = inputText;
  }

  renderMic() {
    const posX = config.scale.width - 574;
    const posY = config.scale.height - 48;

    const mute = this.add
      .sprite(posX, posY, "mute")
      .setDepth(1)
      .setScrollFactor(0, 0)
      .setInteractive();

    const unmute = this.add
      .sprite(posX, posY, "unmute")
      .setDepth(1)
      .setScrollFactor(0, 0)
      .setInteractive()
      .setAlpha(0); // Mute by default.

    mute.on("pointerdown", () => {
      mute.setAlpha(0);
      unmute.clearAlpha();
      this.media.unmute();
    });

    unmute.on("pointerdown", () => {
      unmute.setAlpha(0);
      mute.clearAlpha();
      this.media.mute();
    });
  }

  create() {
    this.initializePeers(this.connectedPlayers);
    this.renderChatBox();
    this.renderMic();

    this.chatBox.on("click", this.focusChatBox);
    this.plugins
      .get("rexClickOutside")
      .add(this.chatBox, {
        enable: true,
        mode: 0, // Fire click event upon press. Set it 1 to fire event upon release.
      })
      .on("clickoutside", () => {
        this.chatBox.setBlur();
      });

    this.input.keyboard.on("keydown-" + "ENTER", () => {
      if (this.chatBox.isFocused === true) {
        this.sendMessage();
        this.chatBox.setBlur();
      } else {
        this.chatBox.setFocus();
      }
    });

    this.input.keyboard.on("keydown-" + "ESC", () => {
      if (this.chatBox.isFocused === true) {
        this.chatBox.setBlur();
      }
    });

    this.input.keyboard.on("keydown-" + "SPACE", () => {
      this.chatBox?.setText(this.chatBox?.text + " ");
    });

    const map = this.make.tilemap({ key: "tilemap" });
    const tileset = map.addTilesetImage("iceworld", "tiles");

    const ground = map.createLayer("ground", tileset);
    ground.setCollisionByProperty({ collides: true });

    map.createLayer("obstacles", tileset);

    const objectsLayer = map.getObjectLayer("objects");

    objectsLayer.objects.forEach((objData) => {
      const { x = 0, y = 0, name, width = 0, height = 0 } = objData;

      switch (name) {
        case "penquin-spawn": {
          this.penquin = this.matter.add
            .sprite(x + width * 0.5, y, "penquin")
            .setFixedRotation();

          // Negative collision group prevents player collision
          // https://brm.io/matter-js/docs/classes/Body.html#property_collisionFilter
          this.penquin.setCollisionGroup(-1);

          this.playerController = new PlayerController(
            this,
            this.penquin,
            this.cursors,
            this.obstacles,
            this.username
          );

          this.cameras.main.startFollow(this.penquin, true);
          break;
        }
      }
    });

    this.matter.world.convertTilemapLayer(ground);

    this.whiteboard = this.add.existing(
      new Whiteboard(
        this,
        2685,
        500,
        700,
        true,
        this.shareWhiteboardLink.bind(this),
        this.penquin
      )
    );

    this.crdt.aware();
    this.crdt.setUsername({ username: this.username });
  }

  shareWhiteboardLink(link: string) {
    this.connectedPlayers.forEach((connectedPlayer) => {
      let message = JSON.stringify({
        type: MessageType.WHITEBOARD,
        content: link,
      });

      connectedPlayer.peer.send(message);
    });
  }
  destroy() {
    this.scene.stop("ui");
  }

  update(t: number, dt: number) {
    this.updatePeers(t, dt);

    this.connectedPlayers.forEach((connection) => {
      connection.controller?.updateLabels();
    });
  }

  updatePeers(t: number, dt: number) {
    if (this.playerController !== undefined) {
      // Update my penguin.
      const shouldUpdateState = this.chatBox.isFocused === false;

      this.playerController.update(dt, shouldUpdateState);

      // Update my state.
      this.crdt.setPosition(this.playerController.getPosition());
      this.crdt.setInput({
        cursor: this.playerController.serializeCursor(),
        input: this.playerController.getStateName(),
        dt: 0, // dt is not being used as of now.
      });

      // Broadcast my state to peers.
      this.crdt.broadcastState();
    }

    // Update peer penguins.
    const peers = this.crdt.getPeers();

    for (const [clientID, peer] of peers) {
      if (peer.get(CRDT_STATE.REMOVED) === true) {
        this.peers.get(clientID)!.destroy();
        this.peers.delete(clientID);

        peers.delete(clientID);

        return;
      }

      const state: State | undefined = peer.get(CRDT_STATE.STATE);

      if (state === undefined) {
        return;
      }

      if (this.peers.has(clientID) === false) {
        this.peers.set(clientID, this.initPeer());

        const username = state.username;

        if (username) {
          this.peers.get(clientID)!.setUsername(username);
        }
      }

      const position = state.position;
      const input = state.input;
      const text = state.text;

      if (position) {
        this.peers.get(clientID)!.moveSprite(position);
      }

      if (input) {
        this.peers.get(clientID)!.simulateInput(input);
      }

      if (text) {
        this.peers.get(clientID)!.chat(text);
      }
    }

    const GAME_TICKS_TILL_POSITION_UPDATE = 1;
    if (this.lastPosBroadcast + GAME_TICKS_TILL_POSITION_UPDATE <= t) {
      this.connectedPlayers.forEach((connectedPlayer) => {
        let message = JSON.stringify({
          type: MessageType.POSITION,
          content: {
            x: this.penquin?.x || 0,
            y: this.penquin?.y || 0,
          },
        });

        connectedPlayer.peer.send(message);
      });
      this.lastPosBroadcast = t;
    }

    this.connectedPlayers.forEach((connectedPlayer) => {
      let message = JSON.stringify({
        type: MessageType.INPUT,
        content: {
          input: this.playerController?.getStateName(),
          cursor: this.playerController?.serializeCursor(),
          dt,
        },
      });

      connectedPlayer.peer.send(message);
    });
  }

  sendMessage() {
    if (this.chatBox.text.length === 0) {
      return;
    }

    const text = {
      text: this.chatBox.text,
      timestamp: this.time.now,
    };

    this.crdt.setText(text);

    this.connectedPlayers.forEach((connectedPlayer) => {
      let message = JSON.stringify({
        type: MessageType.MESSAGE,
        content: this.chatBox.text,
      });

      connectedPlayer.peer.send(message);
    });

    this.userMessages.push({
      content: this.chatBox.text,
      timestamp: this.time.now,
    });

    this.playerController?.chat(this.chatBox.text);
    this.chatBox.setText("");
  }

  focusChatBox() {
    // this.chatBox.setStyle("backgroundColor", "rgba(2,2,2,1)");
  }

  private initPeer(
    x: number = 0,
    y: number = 0,
    username: string = ""
  ): CharacterController {
    let penguin = this.matter.add.sprite(0, 0, "penquin").setFixedRotation();

    penguin.setCollisionGroup(-1);

    return new CharacterController(this, penguin, this.obstacles, username);
  }
}
