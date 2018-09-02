

interface HPBar {

}

interface Effect extends Phaser.GameObjects.Sprite {
    bowOutEvent?: Phaser.Time.TimerEvent;
}

export interface GM extends Phaser.Scene {
    gameIsOver: boolean;
    makeExplosion3(x: number, y: number): Effect;
    attachPart(parent: any, part: any, dx: number, dy: number): void;
    updateHPBar(bar: HPBar, hp: number, maxHP: number, en: number, maxEN: number): void;
}