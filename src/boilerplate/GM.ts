import { Part } from "./entities/Part";


interface HPBar {

}

interface Effect extends Phaser.GameObjects.Sprite {
    bowOutEvent?: Phaser.Time.TimerEvent;
}

export interface GM extends Phaser.Scene {
    partList: Part[];
    gameIsOver: boolean;
    makeExplosion2(x: number, y: number): Effect;
    makeExplosion3(x: number, y: number): Effect;
    attachPart(parent: any, part: any, dx: number, dy: number): void;
    recursiveDetachPart(part: Part): void;
    updateHPBar(bar: HPBar, hp: number, maxHP: number, en: number, maxEN: number): void;
}