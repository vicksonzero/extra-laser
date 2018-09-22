import { Part } from "./entities/Part";
import { Enemy } from "./entities/Enemy";
import { IMatterContactPoints } from "./Utils";
import { Player } from "./entities/Player";
import { ISolidHitsEnemy, ISolidHitsPlayer } from "./entities/IDynamics";


interface HPBar {

}

interface Effect extends Phaser.GameObjects.Sprite {
    bowOutEvent?: Phaser.Time.TimerEvent;
}

interface PlayerBullet extends Phaser.Physics.Matter.Sprite, ISolidHitsEnemy {
    bowOutEvent?: Phaser.Time.TimerEvent;
}

interface EnemyBullet extends Phaser.Physics.Matter.Sprite, ISolidHitsPlayer {
    bowOutEvent?: Phaser.Time.TimerEvent;
}

// TODO: change GM to a class
export interface GM extends Phaser.Scene {
    partList: Part[];
    enemyList: Enemy[];
    bulletList: PlayerBullet[];

    gameIsOver: boolean;
    crashDamage: number;

    makeExplosion1(x: number, y: number): Effect;
    makeExplosion2(x: number, y: number): Effect;
    makeExplosion3(x: number, y: number): Effect;
    attachPart(parent: any, part: any, dx: number, dy: number): void;
    recursiveDetachPart(part: Part): void;
    onEnemyKilled(enemy: Enemy): void;
    displayDamage(x: number, y: number, msg: string, duration: number): void;
    makeSpark(x: number, y: number, ): Effect;
    makeEnemyBullet(
        name: string,
        x: number, y: number,
        key: string, frameName: string,
        speed: number, angle: number
    ): EnemyBullet;
}