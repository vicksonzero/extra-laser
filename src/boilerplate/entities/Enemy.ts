import MatterContainer from "./MatterContainer";
import { ICombatEntity, ISolidHitsPlayer, IAaa } from "./IDynamics";
import { IPartReceiver } from "./IPartReceiver";


import { config } from '../config';
import { GM } from "../GM";
import { collisionCategory } from "./collisionCategory";
import { IMatterContactPoints } from "../Utils";
import { Player } from "./Player";
import { Part } from "./Part";


interface HPBar extends Phaser.GameObjects.GameObject {

}

export class Enemy extends MatterContainer implements ICombatEntity, ISolidHitsPlayer, IAaa {
    gm: GM = null;
    hp: number;
    maxHP: number;


    partHP?: HPBar;
    partWing?: Phaser.GameObjects.Sprite;


    constructor(scene: Phaser.Scene, gm: GM) {
        super(scene, 0, 0, []);
        this.gm = gm;
        this
            .setName('enemy')
            ;
    }
    init(x: number, y: number): this {
        this
            .setX(x)
            .setY(y)
            ;
        this.hp = config.enemy.hp;
        this.maxHP = config.enemy.hp;
        return this;
    }

    initPhysics(): this {
        this
            .setMass(config.enemy.mass)
            .setFrictionAir(config.enemy.drag)
            .setFrictionStatic(config.enemy.drag)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.ENEMY)
            .setCollidesWith(collisionCategory.PLAYER_BULLET | collisionCategory.PLAYER | collisionCategory.PLAYER_PART)
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

    tintFill?: boolean;
    undoTintEvent?: Phaser.Time.TimerEvent;
    canShootEvent?: Phaser.Time.TimerEvent;
    bowOutEvent?: Phaser.Time.TimerEvent;

    takeDamage = (amount: number) => {
        this.hp -= amount;
        this.partWing.setTint(0xffffFF);
        this.gm.updateHPBar(this.partHP, this.hp, this.maxHP, 0, 0);

        this.undoTintEvent = this.gm.time.addEvent({
            delay: 10, loop: false, callback: () => {
                this.partWing.setTint(0xCCCCCC);
            }
        });

        if (this.hp <= 0) {
            if (this.undoTintEvent) this.undoTintEvent.destroy();
            this.gm.makeExplosion1(this.x, this.y);
            this.gm.onEnemyKilled(this);
            this.bowOutEvent.destroy();
            this.canShootEvent.destroy();
            this.gm.enemyList.splice(this.gm.enemyList.indexOf(this), 1);
            this.destroy();
            this.gm.cameras.main.shake(50, 0.02, false);
        }
    };


    onHitPlayerPart(playerPart: Part, contactPoints: { vertex: { x: number; y: number; }; }[]) {

        this.gm.displayDamage(playerPart.x, playerPart.y, '-3', 3000);
        playerPart.takeDamage(3);

        this.gm.displayDamage(this.x, this.y, '-10', 3000);
        this.gm.crashDamage += 10;
        if (this.takeDamage) this.takeDamage(10);

        contactPoints.forEach((contactPoint) => {
            this.gm.makeSpark(contactPoint.vertex.x, contactPoint.vertex.y)
        });
    }

    onHitPlayer(player: Player, contactPoints: { vertex: { x: number; y: number; }; }[]) {
        this.gm.displayDamage(player.x, player.y, '-6', 3000);
        player.takeDamage(6);

        this.gm.displayDamage(this.x, this.y, '-10', 3000);
        this.gm.crashDamage += 10;
        this.takeDamage(10);

        contactPoints.forEach((contactPoint) => {
            this.gm.makeSpark(contactPoint.vertex.x, contactPoint.vertex.y)
        });
    };

    startShooting() {

        this.canShootEvent = this.gm.time.addEvent({
            delay: config.enemy.shootRate,
            callback: this.onCanShoot,
            loop: true
        });

    }

    setBowOutEvent(timeToLive: number) {
        this.bowOutEvent = this.gm.time.addEvent({
            delay: 20 * 1000,
            loop: false,
            callback: this.bowOut,
        });
    }

    private bowOut = () => {
        this.canShootEvent.destroy();
        this.bowOutEvent.destroy();
        this.gm.enemyList.splice(this.gm.enemyList.indexOf(this), 1);
        this.destroy();
    }

    private onCanShoot = () => {
        if (this.gm.gameIsOver) return;
        const bullet = this.gm.makeEnemyBullet('enemy_bullet',
            this.x, this.y + 20,
            "spaceshooter", 'laserRed05',
            config.enemy.bulletSpeed, 180
        );

        this.gm.bulletList.push(bullet);
    }
}