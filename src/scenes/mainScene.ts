import { bindAll } from 'lodash';

import { collisionCategory } from '../entities/collisionCategory';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Part } from '../entities/Part';
import { IMatterContactPoints } from "../Utils";
import { ISolidHitsPlayer } from '../entities/IDynamics';
import { config, ISpriteSpec, IDifficulty, IDifficultyWave } from '../config';
import { HPBar } from '../UI/HPBar';
import { GM } from '../GM';

interface IMoveKeys {
    down: Phaser.Input.Keyboard.Key,
    up: Phaser.Input.Keyboard.Key,
    right: Phaser.Input.Keyboard.Key,
    left: Phaser.Input.Keyboard.Key,
}


interface PlayerBullet extends Phaser.Physics.Matter.Sprite {
    onHitEnemy?: (enemy: Enemy, contactPoints: IMatterContactPoints) => void;
    bowOutEvent?: Phaser.Time.TimerEvent;
}


interface Effect extends Phaser.GameObjects.Sprite {
    bowOutEvent?: Phaser.Time.TimerEvent;
}
interface Star extends Phaser.Physics.Matter.Sprite {
    bowOutEvent?: Phaser.Time.TimerEvent;
}

interface EnemyBullet extends Phaser.Physics.Matter.Sprite, ISolidHitsPlayer {
    bowOutEvent?: Phaser.Time.TimerEvent;
}

export class MainScene extends Phaser.Scene implements GM {

    // movement
    private drag: number = 0.2;
    private playerBulletRapid = 150;
    private playerHP = 20;

    private starsSpawnRate = 1000;


    private enemySpawnInterval = 1000;
    private enemyHP = 6;
    private enemyShootRate = 1000;
    private enemyBulletSpeed = 3.5;

    private startingParts = 1;
    private partSpawnChance = 0.21;
    private partRadius = 18;
    private partHP = 10;
    private bodyAngle = 20;
    private partScatterSpeed = 3;
    private partScatterLife = 10 * 1000;

    // sizes
    private playerScale: number = 0.3;
    private wingManScale: number = 0.4;
    private enemyScale: number = 0.5;
    private bulletScale: number = 0.5;

    // linkage
    private linkageDistance: number = 0.5;
    private linkageStiffness: number = 0.80;
    private linkageDamping: number = 0.07;

    // display objec
    private player: Player;
    private moveKeys: IMoveKeys;

    // display objects list
    private title: Phaser.GameObjects.Text;
    private powerMeter: Phaser.GameObjects.Text;
    private debugLabel: Phaser.GameObjects.Text;
    private debugListLabel: Phaser.GameObjects.Text;
    private titleTween: Phaser.Tweens.Tween;
    public bulletList: PlayerBullet[] = [];
    public partList: Part[] = [];
    public enemyList: Enemy[] = [];
    private constraintList: MatterJS.Constraint[] = [];

    // timers
    private shootTimerEvent: Phaser.Time.TimerEvent;
    private spawnEnemyTimerEvent: Phaser.Time.TimerEvent;
    private spawnStarsTimerEvent: Phaser.Time.TimerEvent;
    private metricsTimerEvent: Phaser.Time.TimerEvent;
    private difficultyTimerEvent: Phaser.Time.TimerEvent;

    // gameFlow
    public gameIsOver = false;
    private score = 0;
    private powerLevel = 0;
    private killPerSecond = 0;
    private totalKill = 0;
    private highestPartCount = 0;
    private killCount: number[] = [0];
    public crashDamage: number = 0;
    private allowedEnemies: number = 1;

    private difficulty: number = 0;
    private difficultyCurve: IDifficulty[] = config.difficultyCurve;

    constructor() {
        super({
            key: "MainScene"
        });

        bindAll(this, [
            'onCanShoot',
            'onCanSpawnEnemy',
            'onCanSpawnStars',
            'onMetrics',
            'updateDifficulty',
        ]);
    }

    preload(): void {
        this.load.atlasXML('spaceshooter', './assets/kenney/sheet.png', './assets/kenney/sheet.xml');
        this.load.atlasXML('spaceshooterExt', './assets/kenney/spaceShooter2_spritesheet.png', './assets/kenney/spaceShooter2_spritesheet.xml');
        this.load.spritesheet('explosion1', './assets/explosion/spritesheet8.png', { frameWidth: 130, spacing: 0, margin: 0, endFrame: 24 });
    }

    create(): void {
        (<any>window).scene = this;

        var config = {
            key: 'explode',
            frames: this.anims.generateFrameNumbers('explosion1', { start: 0, end: 23 }),
            frameRate: 60
        };
        this.anims.create(config);


        this.matter.world
            .setBounds(0, 0, +this.sys.game.config.width, +this.sys.game.config.height)
            .disableGravity()
            ;
        // (<any>this.matter.world.walls).left.restitution = 1;
        // (<any>this.matter.world.walls).right.restitution = 1;
        // (<any>this.matter.world.walls).top.restitution = 1;
        // (<any>this.matter.world.walls).bottom.restitution = 1;

        const playerPartWing = this.add.sprite(0, 0, 'spaceshooter', 'playerShip1_blue')
            .setOrigin(0.5, 0.5)
            .setScale(this.playerScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            ;
        const playerPartHP = new HPBar(this, 0, 20, 100, 4);


        const playerPartContainer = <Player>this.add.existing(new Player(this, this));
        this.player = <Player>this.matter.add.gameObject(playerPartContainer, { shape: { type: 'circle', radius: 10 } });
        this.player
            .initPhysics()
            .initAttachments(playerPartWing, playerPartHP)
            .init((+this.sys.game.config.width) / 2, (+this.sys.game.config.height) * 4 / 5)
            ;



        this.shootTimerEvent = this.time.addEvent({ delay: this.playerBulletRapid, callback: this.onCanShoot, loop: true });
        this.spawnEnemyTimerEvent = this.time.addEvent({ delay: this.enemySpawnInterval, callback: this.onCanSpawnEnemy });
        this.spawnStarsTimerEvent = this.time.addEvent({ delay: this.starsSpawnRate, callback: this.onCanSpawnStars, loop: true });
        this.metricsTimerEvent = this.time.addEvent({ delay: 1000, callback: this.onMetrics, loop: true });
        this.difficultyTimerEvent = this.time.addEvent({ delay: this.difficultyCurve[this.difficulty].wait, callback: this.updateDifficulty });
        this.initStars();


        for (let i = 0; i < this.startingParts; i++) {
            this.makePart(
                +this.sys.game.config.width / 2,
                +this.sys.game.config.height / 2,
                -1, true
            )
        }


        this.registerKeyboard();
        this.registerMouse();
        this.registerCollisionEvents();


        this.displayTitle(
            `Extra Laser\n` +
            `\n` +
            `How to play:\n` +
            `Touch / Mouse / WASD`,
            3000
        );
        this.powerMeter = this.add.text(
            10, 10,
            'Power: 10',
            { color: '#FFFFFF', align: 'left' }
        );

        this.debugLabel = this.add.text(
            10, 30,
            'Debug:',
            { color: '#FF0000', align: 'left', fontSize: '14px' }
        );
    }

    update(time: number, delta: number): void {
        const MATTER_STEP = 16.666;

        if (!this.gameIsOver) {
            // Enables movement of player with WASD keys
            if (this.moveKeys.up.isDown) {
                this.player.applyForce(new Phaser.Math.Vector2(0, -config.player.accel));
            }
            if (this.moveKeys.down.isDown) {
                this.player.applyForce(new Phaser.Math.Vector2(0, config.player.accel));
            }
            if (this.moveKeys.left.isDown) {
                this.player.applyForce(new Phaser.Math.Vector2(-config.player.accel, 0));
            }
            if (this.moveKeys.right.isDown) {
                this.player.applyForce(new Phaser.Math.Vector2(config.player.accel, 0));
            }

            if (this.player.followingMouse && this.player.mouseTarget && this.player.mouseOffset) {
                // this.player.mouseOffset;
                const dest = {
                    x: this.player.mouseTarget.x + this.player.mouseOffset.x,
                    y: this.player.mouseTarget.y + this.player.mouseOffset.y,
                }
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, dest.x, dest.y);
                const physicsDelta = this.matter.world.getDelta(time, delta);
                // console.log(dist, this.topSpeed * physicsDelta / 100 * 1.1);
                const currSpeed = this.player.body.speed;
                // console.log('followingMouse', currSpeed, dist, currSpeed * (physicsDelta / 10));

                if (dist > currSpeed * (physicsDelta / 10)) {
                    // this.matter.moveTo(this.plane, this.plane.mouseTarget.x, this.plane.mouseTarget.y, this.topSpeed);
                    const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y);
                    const direction = new Phaser.Math.Vector2(dest.x, dest.y).subtract(playerPos);
                    direction.scale(config.player.topSpeed / direction.length());
                    this.player.setVelocity(direction.x, direction.y);
                } else {
                    // console.log('snap');

                    this.player.setVelocity(0, 0);
                }
            }
        }
        // Constrain velocity of player
        // this.constrainVelocity(this.plane, this.topSpeed);

    }

    private doWingManShoot(wingMan: Part) {
        const partGun = wingMan.partGun as Phaser.GameObjects.Sprite;

        const bullet1 = this.makeBullet('player_bullet',
            wingMan.x + partGun.x, wingMan.y + partGun.y,
            "spaceshooter", 'laserBlue07',
            20, partGun.angle
        )
        this.bulletList.push(bullet1);
    }

    private onCanShoot(): void {
        if (this.gameIsOver) return;
        const bullet = this.makeBullet('player_bullet',
            this.player.x, this.player.y - 20,
            "spaceshooter", 'laserBlue07',
            20, 0
        );

        this.bulletList.push(bullet);
        this.partList.filter(wingman => wingman.name === 'player_part')
            .forEach(wingMan => this.doWingManShoot(wingMan));
    }

    private onCanSpawnEnemy() {
        // if (this.enemyList.length < this.allowedEnemies) {

        const shipWidth = 50;
        const x = Phaser.Math.Between(shipWidth, +this.sys.game.config.width - shipWidth);
        const y = 0;
        this.spawnEnemy(x, y);
        // }

        this.spawnEnemyTimerEvent = this.time.addEvent({ delay: this.enemySpawnInterval, callback: this.onCanSpawnEnemy, loop: false });
    }



    private initStars() {
        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(0, +this.sys.game.config.width);
            const y = Phaser.Math.Between(0, +this.sys.game.config.height);
            this.spawnStar(x, y);

        }
    }

    private onMetrics() {
        if (this.killCount.length > 10) this.killCount.shift();
        this.killPerSecond = this.killCount.reduce((sum, v) => sum + v, 0) / Math.min(10, this.time.now / 1000);
        console.log('killPerSecond', this.killPerSecond);

        this.killCount.push(0);

        const playerPartCount = this.partList.filter(wingman => wingman.name === 'player_part').length;
        const combatLevel = (
            playerPartCount * 1
        );

        const allowedEnemies = Math.ceil(combatLevel * 0.7);
        // console.log('updateDifficulty', this.enemyList.length);

        this.powerLevel = combatLevel * 150 + allowedEnemies * 100;

        const powerStr = (this.powerLevel < 9000 ? Math.floor(this.powerLevel) : 'over 9000');
        this.powerMeter.setText(`Power: ${powerStr}`);

        this.debugLabel.setText(`${this.killPerSecond.toFixed(2)} \n` +
            `${this.difficulty - 1}. ${allowedEnemies}, ${this.enemySpawnInterval}, ${this.enemyHP.toFixed(2)}\n` +
            `e: ${this.enemyList.length}\n` +
            `b: ${this.bulletList.length}\n` +
            `p: ${this.partList.length}`
        );
    }

    private onCanSpawnStars() {
        const shipWidth = 50;
        const x = Phaser.Math.Between(0, +this.sys.game.config.width);
        const y = 0;
        this.spawnStar(x, y);
    }


    public onEnemyKilled(enemy: Enemy) {
        this.killCount[this.killCount.length - 1]++;
        this.totalKill++;


        this.score += this.powerLevel * enemy.maxHP;
        if (Math.random() <= this.partSpawnChance) {
            this.makePart(
                enemy.x, enemy.y,
                this.partScatterLife, true
            );
        }
    }

    private spawnStar(x: number, y: number) {
        const depth = Phaser.Math.FloatBetween(0, 0.2);
        const star: Star = this.matter.add.sprite(x, y, "spaceshooter", 'star1');
        star.setName('star');
        star.setTint(0xCCCCCC);
        star
            .setOrigin(0.5, 0.5)
            .setScale(0.1 + depth)
            .setAngle(Phaser.Math.Between(0, 360))
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setFrictionAir(0)
            .setFrictionStatic(0)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.STAR)
            .setCollidesWith(0)
            ;

        star.setVelocity(0, 0.3 + depth * 0.2);
        this.time.addEvent({
            delay: 60 * 1000, loop: false, callback: () => {
                star.destroy();
            }
        });
    }

    private spawnEnemy(x: number, y: number) {

        const partWing = this.add.sprite(0, 0, 'spaceshooterExt', 'spaceShips_002')
            .setOrigin(0.5, 0.5)
            .setScale(this.wingManScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setTint(0xCCCCCC)
            ;

        const partHP = new HPBar(this, 0, 20, 30, 4)

        const enemy: Enemy = this.add.existing(new Enemy(this, this)) as Enemy;
        this.matter.add.gameObject(enemy, { shape: { type: 'rectangle', width: 40, height: 30 } });
        enemy
            .initPhysics()
            .initAttachments(partWing, partHP)
            .init(x, y)
            ;

        this.enemyList.push(enemy);

        enemy.setBowOutEvent(config.enemy.bowOutTime * 1000);

        enemy.setVelocity(0, 2);
        enemy.startShooting();
    }

    private makeBullet(
        name: string,
        x: number, y: number,
        key: string, frameName: string,
        speed: number, angle: number
    ): PlayerBullet {
        const bullet = <PlayerBullet>this.matter.add.sprite(
            x, y,
            key, frameName
        );
        bullet.setName(name);


        const velocity = Phaser.Math.Rotate({ x: 0, y: -speed }, Phaser.Math.DegToRad(angle));
        // const velocity = { x: 0, y: -speed };


        this.bulletList.push(bullet);
        (bullet
            .setAlpha(0.9)
            .setAngle(angle)
            .setOrigin(0.5, 0.5)
            .setScale(this.bulletScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setVelocity(velocity.x, velocity.y)
            .setSensor(true)
            .setFixedRotation()
            .setFrictionAir(0)
            .setFrictionStatic(0)
            .setCollisionCategory(collisionCategory.PLAYER_BULLET)
            .setCollidesWith(collisionCategory.ENEMY | collisionCategory.ENEMY_BULLET)
        );

        bullet.bowOutEvent = this.time.addEvent({
            delay: 1000, loop: false, callback: () => {
                destroyBullet();
            }
        });

        const destroyBullet = () => {
            if (bullet.bowOutEvent) bullet.bowOutEvent.destroy();
            this.bulletList.splice(this.bulletList.indexOf(bullet), 1);
            bullet.destroy();
        }

        bullet.onHitEnemy = (enemy: Enemy, contactPoints: IMatterContactPoints) => {
            this.displayDamage(enemy.x, enemy.y, '-1', 3000);
            if (enemy.takeDamage) enemy.takeDamage(1);
            contactPoints.forEach((contactPoint) => {
                this.makeSpark(contactPoint.vertex.x, contactPoint.vertex.y)
            });
            destroyBullet();
        }
        return bullet
    }


    public makeEnemyBullet(
        name: string,
        x: number, y: number,
        key: string, frameName: string,
        speed: number, angle: number
    ): EnemyBullet {
        const bullet = <EnemyBullet>this.matter.add.sprite(
            x, y,
            key, frameName
        );
        bullet.setName(name);


        const velocity = Phaser.Math.Rotate({ x: 0, y: -speed }, Phaser.Math.DegToRad(angle));
        // const velocity = { x: 0, y: -speed };


        this.bulletList.push(bullet);
        (bullet
            .setAlpha(1)
            .setAngle(angle)
            .setOrigin(0.5, 0.5)
            .setScale(this.bulletScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setVelocity(velocity.x, velocity.y)
            .setSensor(true)
            .setFixedRotation()
            .setFrictionAir(0)
            .setFrictionStatic(0)
            .setCollisionCategory(collisionCategory.ENEMY_BULLET)
            .setCollidesWith(collisionCategory.PLAYER | collisionCategory.PLAYER_PART) // collisionCategory.PLAYER_BULLET_SOLID
        );

        bullet.bowOutEvent = this.time.addEvent({
            delay: 10 * 1000, loop: false, callback: () => {
                destroyBullet();
            }
        });

        const destroyBullet = () => {
            if (bullet.bowOutEvent) bullet.bowOutEvent.destroy();
            this.bulletList.splice(this.bulletList.indexOf(bullet), 1);
            bullet.destroy();
        }

        bullet.onHitPlayer = (player: Player, contactPoints: IMatterContactPoints) => {
            this.displayDamage(player.x, player.y, '-3', 3000);
            if (player.takeDamage) player.takeDamage(3);
            contactPoints.forEach((contactPoint) => {
                this.makeSpark(contactPoint.vertex.x, contactPoint.vertex.y)
            });
            destroyBullet();
        }


        bullet.onHitPlayerPart = (part: Part, contactPoints: IMatterContactPoints) => {
            this.displayDamage(part.x, part.y, '-2', 3000);
            if (part.takeDamage) part.takeDamage(2);
            contactPoints.forEach((contactPoint) => {
                this.makeSpark(contactPoint.vertex.x, contactPoint.vertex.y)
            });
            destroyBullet();
        }
        return bullet;
    }

    private makePart(
        x: number, y: number,
        timeToLive: number, doScatter: boolean
    ) {
        const wingSpriteSpec: ISpriteSpec = Phaser.Utils.Array.GetRandom(
            config.playerPart.partWingCandidates
        );

        const gunSpriteSpec: ISpriteSpec = Phaser.Utils.Array.GetRandom(
            config.playerPart.partGunCandidates
        );

        const gunOffsetNoise = config.playerPart.gunOffsetNoise;
        const gunOffset = {
            x: Phaser.Math.FloatBetween(-gunOffsetNoise, gunOffsetNoise) + config.playerPart.gunOffsetX,
            y: Phaser.Math.FloatBetween(-gunOffsetNoise, gunOffsetNoise) + config.playerPart.gunOffsetY,
        };


        const partWing = this.add.sprite(0, 0, wingSpriteSpec.key, wingSpriteSpec.frame)
            .setOrigin(0.5, 0.5)
            .setTint(0xAAAAAA)
            .setScale(this.wingManScale * 1.5)
            .setAngle(Phaser.Math.FloatBetween(0, 359))
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            ;
        const partGun = this.add.sprite(0, 0, gunSpriteSpec.key, gunSpriteSpec.frame)
            .setX(gunOffset.x)
            .setY(gunOffset.y)
            .setAngle(Phaser.Math.FloatBetween(-this.bodyAngle, this.bodyAngle))
            .setOrigin(0.5, 0.5)
            .setScale(this.wingManScale * 1.5)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            ;
        const partHP = new HPBar(this, 0, 0, this.partRadius * 1.2, 4);

        const part: Part = this.add.existing(new Part(this, this)) as Part;
        this.matter.add.gameObject(part, { shape: { type: 'circle', radius: this.partRadius } });
        part
            .initPhysics()
            .initAttachments(partWing, partGun, partHP)
            .init(x, y)
            ;

        this.partList.push(part);
        // console.log(this.wingManList);

        if (timeToLive > -1) {
            part.setDestroyTimerWithWarning(timeToLive);
        }

        if (doScatter) {
            const velocity = Phaser.Math.Rotate(
                { x: 0, y: this.partScatterSpeed },
                Phaser.Math.FloatBetween(-Math.PI / 2, Math.PI / 2)
            );
            part.setVelocity(velocity.x, velocity.y);
        }
    }

    public makeSpark(
        x: number, y: number,
    ): Effect {
        const spark: Effect = this.add.sprite(
            x, y,
            'spaceshooter', 'star3'
        );
        spark.setName('star');

        const color = Phaser.Display.Color.HSLToColor(Phaser.Math.FloatBetween(0, 1), 1, 0.9).color;
        (spark
            .setOrigin(0.5, 0.5)
            .setScale(this.bulletScale * 2)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setTint(color)
        );

        spark.bowOutEvent = this.time.addEvent({
            delay: 50, loop: false, callback: () => {
                destroySpark();
            }
        });

        const destroySpark = () => {
            if (spark.bowOutEvent) spark.bowOutEvent.destroy();
            spark.destroy();
        }

        return spark
    }


    public makeExplosion1(
        x: number, y: number,
    ): Effect {
        const explosion: Effect = this.add.sprite(
            x, y,
            'explosion1'
        );

        explosion.anims.play('explode');

        explosion.setName('explosion');

        // const color = Phaser.Display.Color.HSLToColor(Phaser.Math.FloatBetween(0, 1), 1, 0.9).color;
        (explosion
            .setOrigin(0.5, 0.4)
            .setScale(this.bulletScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            // .setTint(color)
        );

        explosion.bowOutEvent = this.time.addEvent({
            delay: 500, loop: false, callback: () => {
                destroySpark();
            }
        });

        const destroySpark = () => {
            if (explosion.bowOutEvent) explosion.bowOutEvent.destroy();
            explosion.destroy();
        }

        return explosion;
    }


    public makeExplosion2(
        x: number, y: number,
    ): Effect {
        const explosion: Effect = this.add.sprite(
            x, y,
            'explosion1'
        );

        explosion.anims.play('explode');

        explosion.setName('explosion');

        // const color = Phaser.Display.Color.HSLToColor(Phaser.Math.FloatBetween(0, 1), 1, 0.9).color;
        (explosion
            .setOrigin(0.5, 0.4)
            .setScale(this.bulletScale * 1.5)
            .setTint(0xFF8888)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            // .setTint(color)
        );

        explosion.bowOutEvent = this.time.addEvent({
            delay: 500, loop: false, callback: () => {
                destroySpark();
            }
        });

        const destroySpark = () => {
            if (explosion.bowOutEvent) explosion.bowOutEvent.destroy();
            explosion.destroy();
        }

        return explosion;
    }

    public makeExplosion3(
        x: number, y: number,
    ): Effect {
        const explosion: Effect = this.add.sprite(
            x, y,
            'explosion1'
        );

        explosion.anims.play('explode');

        explosion.setName('explosion');

        // const color = Phaser.Display.Color.HSLToColor(Phaser.Math.FloatBetween(0, 1), 1, 0.9).color;
        (explosion
            .setOrigin(0.5, 0.4)
            .setScale(this.bulletScale * 5)
            .setTint(0x88FFFF)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            // .setTint(color)
        );

        explosion.bowOutEvent = this.time.addEvent({
            delay: 100, loop: false, callback: () => {
                destroySpark();
                this.displayTitle(
                    `Game Over\n` +
                    `\n` +
                    `Score: ${Math.floor(this.score / 100)}\n` +
                    `Refresh browser to restart`,
                    60 * 1000
                );
            }
        });

        const destroySpark = () => {
            if (explosion.bowOutEvent) explosion.bowOutEvent.destroy();
            explosion.destroy();
        }

        return explosion;
    }

    private displayTitle(msg: string, duration: number) {
        if (!this.title) {
            this.title = this.add.text(
                (+this.sys.game.config.width) / 2,
                (+this.sys.game.config.height) / 2,
                msg,
                { color: '#FFFFFF', align: 'center' }
            );

            this.title.setOrigin(0.5);
        }
        this.title.setText(msg);
        this.title.alpha = 1;
        if (this.titleTween) this.titleTween.stop();
        this.titleTween = this.tweens.add({
            targets: this.title,
            alpha: 0,
            ease: 'Power1',
            duration: 3000,
            delay: duration,
        });
    }

    private displayToast(x: number, y: number, msg: string, duration: number) {
        const toast = this.add.text(
            x, y,
            msg,
            { color: '#FFFFFF', align: 'center' }
        );

        toast.setOrigin(0.5);
        toast.setText(msg);
        toast.alpha = 1;
        this.tweens.add({
            targets: toast,
            y: y - 100,
            alpha: 0,
            ease: 'Power1',
            duration: duration,
            delay: 0,
        });
    }

    public displayDamage(x: number, y: number, msg: string, duration: number) {
        const toast = this.add.text(
            x, y,
            msg,
            { color: '#FF8888', align: 'center', fontSize: '14px' }
        );

        toast.setOrigin(0.5);
        toast.setText(msg);
        toast.alpha = 1;
        this.tweens.add({
            targets: toast,
            y: y - 20,
            alpha: 0,
            ease: 'Power1',
            duration: duration,
            delay: 0,
        });
    }

    /**
     * @todo change any back to Phaser.Physics.Matter.*
     */
    public attachPart(parent: any, part: Part, dx: number, dy: number) {

        part.setVelocity(0);
        part.setName('player_part').setAlpha(1);
        part
            .setCircle(15, {})
            .setFixedRotation()
            .setMass(config.playerPart.mass / 400)
            .setX(parent.x + dx)
            .setY(parent.y + dy)
            ;
        part.hp = config.playerPart.hp;
        part.maxHP = config.playerPart.hp;
        part.onHitPart = (parent: any, part: Part, contactPoints: IMatterContactPoints) => {
            const displacement = new Phaser.Math.Vector2(part.x, part.y).subtract(
                new Phaser.Math.Vector2(parent.x, parent.y)
            );

            this.attachPart(parent, part, displacement.x, displacement.y);
        };
        part
            .setCollisionCategory(collisionCategory.PLAYER_PART)
            ;


        part.takeDamage = (amount: number) => {
            part.hp -= amount;

            if (part.partWing) {
                const wing = part.partWing;
                wing.setTint(0xff0000);

                part.undoTintEvent = this.time.addEvent({
                    delay: 200, loop: false, callback: () => {
                        wing.setTint(0xAAAAAA);
                    }
                });
            }
            if (part.partHP) {
                part.partHP.updateHPBar(part.hp, part.maxHP, 0, 0);
            }

            if (part.hp <= 0) {
                if (part.undoTintEvent) part.undoTintEvent.destroy();
                this.makeExplosion2(part.x, part.y);
                this.partList.splice(this.partList.indexOf(part), 1);

                this.recursiveDetachPart(part);
                part.destroy();
                this.cameras.main.shake(100, 0.04, false);
            }
        }

        if (part.destroyTimer) part.destroyTimer.destroy();
        const constraint = this.matter.add.constraint(parent, part, this.linkageDistance, this.linkageStiffness, {
            pointA: { x: dx, y: dy },
            damping: this.linkageDamping,
        });
        // (<any>constraint).;
        this.constraintList.push(constraint);

        const playerPartCount = this.partList.filter(part => part.name === 'player_part').length;
        this.displayToast(part.x, part.y, `${playerPartCount}: Extra Gun`, 5000);

        this.highestPartCount = Math.max(this.highestPartCount, playerPartCount);
    }

    public recursiveDetachPart(part: Part) {
        const byeByeList = this.constraintList.filter((constraint: any) => constraint.bodyA.id === part.body.id);
        byeByeList.forEach((constraint: any) => this.recursiveDetachPart(constraint.bodyB.gameObject));

        const constraint = this.constraintList.find((constraint: any) => constraint.bodyB.id === part.body.id);
        if (constraint) {
            const bodyA: Part = (<any>constraint).bodyA;
            const bodyB: Part = (<any>constraint).bodyB;
            this.matter.world.removeConstraint(constraint, false);
            this.constraintList.splice(this.constraintList.indexOf(constraint), 1);
        }

        part
            .setName('part')
            .setMass(config.playerPart.mass)
            .setFrictionAir(0)
            .setFrictionStatic(0)
            .setBounce(1)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.PART)
            .setCollidesWith(collisionCategory.WORLD | collisionCategory.PLAYER | collisionCategory.PART | collisionCategory.PLAYER_PART)
            ;


        const velocity = Phaser.Math.Rotate({ x: 0, y: this.partScatterSpeed }, Phaser.Math.FloatBetween(0, Math.PI * 2));
        (<any>part).setVelocity(velocity.x, velocity.y);

    }

    private registerCollisionEvents(): void {
        this.matter.world.on('collisionstart', (event: any, bodyA: any, bodyB: any) => {
            const { pairs } = event;
            pairs.forEach((pair: any) => {
                const bodyA: any = pair.bodyA;
                const bodyB: any = pair.bodyB;
                const activeContacts: any = pair.activeContacts;
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                console.log('collision', bodyA.gameObject.name, bodyB.gameObject.name);
                
                this.checkPairGameObjectName('player_bullet', 'enemy', bodyA, bodyB, (a: any, b: any) => {
                    (<PlayerBullet>a.gameObject).onHitEnemy(b.gameObject, activeContacts);
                });
                if (!(bodyA.gameObject && bodyB.gameObject)) return;

                this.checkPairGameObjectName('enemy', 'player_part', bodyA, bodyB, (a: any, b: any) => {
                    (<Enemy>a.gameObject).onHitPlayerPart(b.gameObject, activeContacts);
                });
                if (!(bodyA.gameObject && bodyB.gameObject)) return;

                this.checkPairGameObjectName('enemy', 'player', bodyA, bodyB, (a: any, b: any) => {
                    (<Enemy>a.gameObject).onHitPlayer(b.gameObject, activeContacts);
                });
                if (!(bodyA.gameObject && bodyB.gameObject)) return;

                this.checkPairGameObjectName('enemy_bullet', 'player', bodyA, bodyB, (a: any, b: any) => {
                    (<Enemy>a.gameObject).onHitPlayer(b.gameObject, activeContacts);
                });
                if (!(bodyA.gameObject && bodyB.gameObject)) return;

                this.checkPairGameObjectName('enemy_bullet', 'player_part', bodyA, bodyB, (a: any, b: any) => {
                    (<Enemy>a.gameObject).onHitPlayerPart(b.gameObject, activeContacts);
                });
                if (!(bodyA.gameObject && bodyB.gameObject)) return;

                this.checkPairGameObjectName('player', 'part', bodyA, bodyB, (a: any, b: any) => {
                    (<Player>a.gameObject).onHitPart(a.gameObject, b.gameObject, activeContacts);
                });
                if (!(bodyA.gameObject && bodyB.gameObject)) return;

                this.checkPairGameObjectName('player_part', 'part', bodyA, bodyB, (a: any, b: any) => {
                    (<Player>a.gameObject).onHitPart(a.gameObject, b.gameObject, activeContacts);
                });
                if (!(bodyA.gameObject && bodyB.gameObject)) return;

            });
        });
    }

    private checkPairGameObjectName(
        nameA: string, nameB: string,
        bodyA: any, bodyB: any,
        matchFoundCallback: (a: any, b: any) => void
    ): void {
        if (bodyA.gameObject.name === nameA && bodyB.gameObject.name === nameB) {
            matchFoundCallback(bodyA, bodyB);
        } else if (bodyB.gameObject.name === nameA && bodyA.gameObject.name === nameB) {
            matchFoundCallback(bodyB, bodyA);
        }
    }

    private registerKeyboard(): void {

        // Creates object for input with WASD kets
        this.moveKeys = this.input.keyboard.addKeys({
            'up': Phaser.Input.Keyboard.KeyCodes.W,
            'down': Phaser.Input.Keyboard.KeyCodes.S,
            'left': Phaser.Input.Keyboard.KeyCodes.A,
            'right': Phaser.Input.Keyboard.KeyCodes.D
        }) as IMoveKeys;


        // Stops player acceleration on uppress of WASD keys
        this.input.keyboard.on('keyup_W', (event: any) => {
            if (this.moveKeys.down.isUp) {
                // this.plane.setAccelerationY(0);
            }
        });
        this.input.keyboard.on('keyup_S', (event: any) => {
            if (this.moveKeys.up.isUp) {
                // this.plane.setAccelerationY(0);
            }
        });
        this.input.keyboard.on('keyup_A', (event: any) => {
            if (this.moveKeys.right.isUp) {
                // this.plane.setAccelerationX(0);
            }
        });
        this.input.keyboard.on('keyup_D', (event: any) => {
            if (this.moveKeys.left.isUp) {
                // this.plane.setAccelerationX(0);
            }
        });
    }

    private registerMouse(): void {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.player.followingMouse = true;
            this.player.mouseTarget = pointer;
            this.player.mouseOffset = {
                x: this.player.x - pointer.x,
                y: this.player.y - pointer.y,
            };
        });
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            this.player.followingMouse = false;
        });
    }

    private updateDifficulty() {
        const diff = this.difficultyCurve[this.difficulty];


        console.log(`${this.difficulty}. ${diff.desc}`, diff);
        if (diff.end) {
            const title = `Congratulations, you have won\n` +
                '\n\n' +
                `Score: ${Math.floor(this.score / 100)}\n` +
                `Time: ${(this.time.now / 1000).toFixed(2)}s\n` +
                `Largest ship size: ${this.highestPartCount + 1}\n` +
                `Take-downs: ${this.totalKill}\n` +
                `Crash attack: ${this.crashDamage}`
                ;

            this.displayTitle(title, 20000);

            this.player.setCollisionCategory(0);
            this.partList.forEach((part) => part.setCollisionCategory(0));
            this.gameIsOver = true;
            this.time.addEvent({ delay: 4000, callback: () => this.player.setVelocityY(-6).setFrictionAir(0).setFrictionStatic(0) });
            this.spawnEnemyTimerEvent.destroy();
        } else {
            const diffWave = diff as IDifficultyWave;
            this.allowedEnemies = diffWave.allowedEnemies;
            this.enemyHP = diffWave.enemyHP;
            this.enemySpawnInterval = diffWave.enemySpawnInterval;

            this.difficulty++;
            const nextDiff = this.difficultyCurve[this.difficulty];
            if (!nextDiff) return;
            this.difficultyTimerEvent = this.time.addEvent({ delay: nextDiff.wait, callback: this.updateDifficulty });
        }
    }
}
