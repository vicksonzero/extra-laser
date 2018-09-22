import MatterContainer from './MatterContainer';
import { ICombatEntity } from './IDynamics';

import { collisionCategory } from './collisionCategory';

import { GM } from '../GM';
import { IPartReceiver } from './IPartReceiver';
import { applyMixins } from '../Utils';
import { Part } from './Part';

import { config } from '../config';

interface HPBar extends Phaser.GameObjects.GameObject {

}

export class Player extends MatterContainer implements ICombatEntity, IPartReceiver {
    gm: GM = null;
    hp: number;
    maxHP: number;

    partHP?: HPBar;
    partWing?: Phaser.GameObjects.Sprite;

    // input
    mouseTarget?: Phaser.Input.Pointer;
    mouseOffset?: { x: number, y: number };
    followingMouse?: boolean;


    // onHitPart?: (parent: any, part: Part, contactPoints: { vertex: { x: number, y: number } }[]) => void;

    private undoTintEvent?: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene, gm: GM) {
        super(scene, 0, 0, []);
        this.gm = gm;
        this
            .setName('player')
            ;
    }
    init(x: number, y: number): this {
        this
            .setX(x)
            .setY(y)
            ;
        this.hp = config.player.hp;
        this.maxHP = config.player.hp;
        return this;
    }

    initPhysics(): this {
        this
            .setMass(config.player.mass / 4)
            .setFrictionAir(config.player.drag)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.PLAYER)
            .setCollidesWith(collisionCategory.WORLD | collisionCategory.ENEMY | collisionCategory.ENEMY_BULLET | collisionCategory.PART)
            ;
        return this;
    }

    initAttachments(playerPartWing: Phaser.GameObjects.Sprite, playerPartHP: HPBar): this {

        this.add(playerPartWing);
        this.partWing = playerPartWing;
        this.add(playerPartHP);
        this.partHP = playerPartHP;
        return this;
    }

    takeDamage(amount: number): this {

        this.hp -= amount;

        const wing = this.partWing;
        wing.setTint(0xff0000);
        this.gm.updateHPBar(this.partHP, this.hp, this.maxHP, 0, 0);

        this.undoTintEvent = this.gm.time.addEvent({
            delay: 200, loop: false, callback: () => {
                wing.setTint(0xAAAAAA);
            }
        });

        if (this.hp <= 0) {
            if (this.undoTintEvent) this.undoTintEvent.destroy();
            this.gm.makeExplosion3(this.x, this.y);
            this.gm.gameIsOver = true;
            this.visible = false;
            this
                .setCollisionCategory(0)
                ;
            // .setPosition(-1000, -1000);
            this.gm.cameras.main.shake(1000, 0.04, false);
        }
        return this;
    }
    onHitPart(parent: this, part: Part, contactPoints: { vertex: { x: number; y: number; }; }[]): void {
        throw new Error("Method not implemented.");
    }
}

applyMixins(Player, [IPartReceiver]);