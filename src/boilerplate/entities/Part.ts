import { IPartReceiver } from "./IPartReceiver";
import { GM } from "../GM";
import { ICombatEntity } from "./ICombatEntity";
import { collisionCategory } from './collisionCategory';
import MatterContainer from "./MatterContainer";
import { IMatterContactPoints } from "../Utils";

import { config } from '../config';

interface HPBar extends Phaser.GameObjects.GameObject {

}

export class Part extends MatterContainer implements ICombatEntity, IPartReceiver {
    public gm: GM;

    hp: number;
    maxHP: number;
    container?: this;
    partWing?: Phaser.GameObjects.Sprite;
    partGun?: Phaser.GameObjects.GameObject;
    partHP?: HPBar;
    undoTintEvent?: Phaser.Time.TimerEvent;
    destroyTimer?: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene, gm: GM) {
        super(scene, 0, 0, []);
        this.gm = gm;
        this
            .setName('part')
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
        const { playerPart } = config;
        this
            .setMass(playerPart.mass)
            .setFrictionAir(playerPart.drag)
            .setFrictionStatic(playerPart.drag)
            .setBounce(playerPart.bounce)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.PART)
            .setCollidesWith(collisionCategory.WORLD | collisionCategory.PLAYER | collisionCategory.PART | collisionCategory.PLAYER_PART)
            ;
        return this;
    }

    initAttachments(partWing: Phaser.GameObjects.Sprite, partGun: Phaser.GameObjects.Sprite, partHP: HPBar): this {
        this.add(partWing);
        this.partWing = partWing;

        this.add(partGun);
        this.partGun = partGun;

        this.add(partHP);
        this.partHP = partHP;
        return this;
    }


    takeDamage(amount: number) {
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
            this.gm.makeExplosion2(this.x, this.y);
            this.gm.partList.splice(this.gm.partList.indexOf(this), 1);

            this.gm.recursiveDetachPart(this);
            this.destroy();
            this.gm.cameras.main.shake(100, 0.04, false);
        }
    }


    public setDestroyTimerWithWarning(timeToLive: number): this {
        this.destroyTimer = this.gm.time.addEvent({
            delay: (timeToLive > 2000 ? timeToLive - 2000 : timeToLive * 0.2),
            callback: () => {
                this.setAlpha(0.5);
                this.setDestroyTimer(timeToLive > 2000 ? 2000 : timeToLive * 0.5);
            }
        });
        return this;
    }

    public setDestroyTimer(timeToLive: number): this {
        this.destroyTimer = this.gm.time.addEvent({
            delay: timeToLive,
            callback: this.destroyPart,
        });
        return this;
    }

    public destroyPart = (): void => {
        if (this.destroyTimer) this.destroyTimer.destroy();
        this.gm.partList.splice(this.gm.partList.indexOf(this), 1);
        this.gm.makeExplosion2(this.x, this.y);
        this.destroy();
    }

    onHitPart(parent: this, part: Part, contactPoints: IMatterContactPoints): void {
        throw new Error("Method not implemented.");
    }

}