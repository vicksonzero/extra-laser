

/// <reference path="../phaser.d.ts"/>

import "phaser";
import { MainScene } from "./scenes/mainScene";

// main game configuration
const config: GameConfig = {
    width: 360,
    height: 640,
    type: Phaser.AUTO,
    parent: "game",
    scene: MainScene,
    physics: {
        default: "matter",
        matter: {
            debug: false,
        }
    },
};

// game class
export class Game extends Phaser.Game {
    constructor(config: GameConfig) {
        super(config);
    }
}

// when the page is loaded, create our game instance
window.onload = () => {
    var game = new Game(config);
};
