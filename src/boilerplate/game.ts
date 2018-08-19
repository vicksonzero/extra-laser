

/// <reference path="../phaser.d.ts"/>

import "phaser";
import { MainScene } from "./scenes/mainScene";

// main game configuration
const config: GameConfig = {
    width: 360,
    height: 640,
    disableContextMenu: true,
    type: Phaser.AUTO,
    parent: "game",
    scene: MainScene,
    physics: {
        default: "matter",
        matter: {
            // debug: true,
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

    window.addEventListener('resize', (event) => {
        const ww = window.innerWidth / 360;
        const hh = window.innerHeight / 640;

        const min = Math.min(ww, hh);
        console.log('resize', window.innerWidth, ww, window.innerHeight, hh, min);

        game.canvas.style.width = `${min * 360}px`;
        game.canvas.style.height = `${min * 640}px`;
    });
    console.log('hi');
    
    // setTimeout(() => {
        const ww = window.innerWidth / 360;
        const hh = window.innerHeight / 640;

        const min = Math.min(ww, hh);
        console.log('resize', window.innerWidth, ww, window.innerHeight, hh, min);

        game.canvas.style.width = `${min * 360}px`;
        game.canvas.style.height = `${min * 640}px`;
    // }, 100);
};
