import { GM } from "../GM";
import { Part } from "./Part";

export class IPartReceiver {

    public gm: GM;
    public x: number;
    public y: number;
    onHitPart(parent: this, part: Part, contactPoints: { vertex: { x: number, y: number } }[]) {
        // debugger;
        const displacement = new Phaser.Math.Vector2(part.x, part.y).subtract(
            new Phaser.Math.Vector2(this.x, this.y)
        );

        this.gm.attachPart(this, part, displacement.x, displacement.y);
    }
}