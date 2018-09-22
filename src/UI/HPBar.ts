import { Scene } from "phaser";

export class HPBar extends Phaser.GameObjects.Graphics {
    barWidth: number;
    barHeight: number;

    constructor(scene: Scene, x: number, y: number, barWidth: number, barHeight: number) {
        super(scene, { x, y });
        this.barWidth = barWidth;
        this.barHeight = barHeight;
    }


    updateHPBar(hp: number, maxHP: number, en: number, maxEN: number) {
        this.clear();
        const width = this.barWidth;
        const height = this.barHeight;

        const hue = (hp / maxHP * 120 / 360);
        const color = Phaser.Display.Color.HSLToColor(hue, 1, 0.5).color;

        this.lineStyle(1, color, 1);
        this.strokeRect(-width / 2, -height / 2, width, height);

        this.fillStyle(color, 1);
        this.fillRect(-width / 2, -height / 2, hp / maxHP * width, height);
    }
}