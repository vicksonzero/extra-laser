import { bindAll } from 'lodash';

interface IMoveKeys {
    down: Phaser.Input.Keyboard.Key,
    up: Phaser.Input.Keyboard.Key,
    right: Phaser.Input.Keyboard.Key,
    left: Phaser.Input.Keyboard.Key,
}

type IDifficulty = IDifficultyWave | IDifficultyEnding;

interface IDifficultyWave {
    wait: number;
    desc?: string;
    allowedEnemies?: number;
    enemyHP?: number;
    enemySpawnInterval?: number;
    end?: boolean;
}

interface IDifficultyEnding {
    wait: number;
    desc?: string;
    end: boolean;
}

interface Player extends Phaser.GameObjects.Container {
    hp?: number;
    maxHP?: number;
    partHP?: HPBar;
    partWing?: Phaser.GameObjects.Sprite;
    mouseTarget?: Phaser.Input.Pointer;
    followingMouse?: boolean;
    onHitPart?: (parent: any, part: Part, contactPoints: { vertex: { x: number, y: number } }[]) => void;
    takeDamage?: (amount: number) => void;
    undoTintEvent?: Phaser.Time.TimerEvent;
}
interface PlayerBullet extends Phaser.Physics.Matter.Sprite {
    onHitEnemy?: (enemy: Enemy, contactPoints: { vertex: { x: number, y: number } }[]) => void;
    bowOutEvent?: Phaser.Time.TimerEvent;
}

interface Part extends Phaser.GameObjects.Container {
    hp?: number;
    maxHP?: number;
    container?: PartContainer;
    partWing?: Phaser.GameObjects.GameObject;
    partGun?: Phaser.GameObjects.GameObject;
    partHP?: HPBar;
    takeDamage?: (amount: number) => void;
    onHitPart?: (parent: any, part: Part, contactPoints: { vertex: { x: number, y: number } }[]) => void;
    destroyTimer?: Phaser.Time.TimerEvent;
}

interface PartContainer extends Phaser.GameObjects.Container {

}



interface Effect extends Phaser.GameObjects.Sprite {
    bowOutEvent?: Phaser.Time.TimerEvent;
}
interface Star extends Phaser.Physics.Matter.Sprite {
    bowOutEvent?: Phaser.Time.TimerEvent;
}



interface Enemy extends Phaser.Physics.Matter.Sprite {
    hp?: number;
    maxHP?: number;
    partWing: Phaser.GameObjects.Sprite;
    partHP: Phaser.GameObjects.Graphics;
    takeDamage?: (amount: number) => void;
    onHitPlayerPart?: (enemy: any, playerPart: Part, contactPoints: { vertex: { x: number, y: number } }[]) => void;
    onHitPlayer?: (enemy: any, player: Player, contactPoints: { vertex: { x: number, y: number } }[]) => void;
    tintFill?: boolean;
    undoTintEvent?: Phaser.Time.TimerEvent;
    canShootEvent?: Phaser.Time.TimerEvent;
    bowOutEvent?: Phaser.Time.TimerEvent;
}

interface EnemyBullet extends Phaser.Physics.Matter.Sprite {
    onHitPlayerPart?: (bullet: any, playerPart: Part, contactPoints: { vertex: { x: number, y: number } }[]) => void;
    onHitPlayer?: (bullet: any, player: Player, contactPoints: { vertex: { x: number, y: number } }[]) => void;
    bowOutEvent?: Phaser.Time.TimerEvent;
}

interface HPBar extends Phaser.GameObjects.Graphics {
    barWidth?: number;
    barHeight?: number;
}

enum collisionCategory {
    WORLD = 1 << 0,
    PLAYER = 1 << 1,
    PLAYER_BULLET = 1 << 2,
    ENEMY = 1 << 3,
    ENEMY_BULLET = 1 << 4,
    STAR = 1 << 5,
    PART = 1 << 6,
    PLAYER_PART = 1 << 7,
}


export class MainScene extends Phaser.Scene {

    // movement
    private topSpeed: number = 6;
    private accel: number = 2.5;
    private mass = 3000;
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
    private bulletList: PlayerBullet[] = [];
    private partList: any[] = []; /** @todo remove any */
    private enemyList: Enemy[] = [];
    private constraintList: MatterJS.Constraint[] = [];

    // timers
    private shootTimerEvent: Phaser.Time.TimerEvent;
    private spawnEnemyTimerEvent: Phaser.Time.TimerEvent;
    private spawnStarsTimerEvent: Phaser.Time.TimerEvent;
    private metricsTimerEvent: Phaser.Time.TimerEvent;
    private difficultyTimerEvent: Phaser.Time.TimerEvent;

    // gameFlow
    private gameIsOver = false;
    private score = 0;
    private powerLevel = 0;
    private killPerSecond = 0;
    private totalKill = 0;
    private highestPartCount = 0;
    private killCount: number[] = [0];
    private crashDamage: number = 0;
    private allowedEnemies: number = 1;

    private difficulty: number = 0;
    private difficultyCurve: IDifficulty[] = [
        { wait: 0, desc: 'init', allowedEnemies: 2, enemySpawnInterval: 1500, enemyHP: 6 },
        { wait: 5000, desc: '', allowedEnemies: 3, enemySpawnInterval: 1300, enemyHP: 7 },
        { wait: 10000, desc: '', allowedEnemies: 4, enemySpawnInterval: 1000, enemyHP: 8 },
        { wait: 10000, desc: '', allowedEnemies: 5, enemySpawnInterval: 1000, enemyHP: 8 },
        { wait: 8000, desc: '', allowedEnemies: 5, enemySpawnInterval: 1000, enemyHP: 9 },
        { wait: 5000, desc: '', allowedEnemies: 7, enemySpawnInterval: 800, enemyHP: 11 },
        { wait: 7000, desc: '', allowedEnemies: 9, enemySpawnInterval: 700, enemyHP: 15 },
        { wait: 10000, desc: '', allowedEnemies: 12, enemySpawnInterval: 500, enemyHP: 15 },
        { wait: 10000, desc: '', allowedEnemies: 12, enemySpawnInterval: 500, enemyHP: 17 },
        { wait: 10000, desc: '', allowedEnemies: 15, enemySpawnInterval: 700, enemyHP: 19 },
        { wait: 10000, desc: '', allowedEnemies: 15, enemySpawnInterval: 700, enemyHP: 19 },
        { wait: 20000, desc: 'end', end: true },
    ];

    constructor() {
        super({
            key: "MainScene"
        });

        bindAll(this, [
            'onCanShoot',
            'onCanSpawnEnemy',
            'onCanSpawnStars',
            'onPlayerHitPart',
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

        const playerPartContainer = this.add.container((+this.sys.game.config.width) / 2, (+this.sys.game.config.height) * 4 / 5, []);
        const playerPartWing = this.add.sprite(0, 0, 'spaceshooter', 'playerShip1_blue');
        const playerPartHP = this.makeHPBar(0, 20, 100, 4);

        playerPartContainer.add(playerPartWing
            .setOrigin(0.5, 0.5)
            .setScale(this.playerScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
        );

        playerPartContainer.add(playerPartHP
            //
        );

        this.player = <Player>this.matter.add.gameObject(playerPartContainer, { shape: { type: 'circle', radius: 10 } });

        this.player.setName('player');
        (<any>this.player)
            .setMass(this.mass / 4)
            .setFrictionAir(this.drag)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.PLAYER)
            .setCollidesWith(collisionCategory.WORLD | collisionCategory.ENEMY | collisionCategory.ENEMY_BULLET | collisionCategory.PART)
            ;
        this.player.onHitPart = this.onPlayerHitPart;
        this.player.hp = this.playerHP;
        this.player.maxHP = this.playerHP;
        this.player.partWing = playerPartWing;
        this.player.partHP = playerPartHP;

        this.player.takeDamage = (amount: number) => {
            this.player.hp -= amount;

            const wing = this.player.partWing;
            wing.setTint(0xff0000);
            this.updateHPBar(this.player.partHP, this.player.hp, this.player.maxHP, 0, 0);

            this.player.undoTintEvent = this.time.addEvent({
                delay: 200, loop: false, callback: () => {
                    wing.setTint(0xAAAAAA);
                }
            });

            if (this.player.hp <= 0) {
                if (this.player.undoTintEvent) this.player.undoTintEvent.destroy();
                this.makeExplosion3(this.player.x, this.player.y);
                this.gameIsOver = true;
                this.player.visible = false;
                (<any>this.player)
                    .setCollisionCategory(0)
                // .setPosition(-1000, -1000);
                this.cameras.main.shake(1000, 0.04, false);
            }
        }



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
                (<any>this.player).applyForce(new Phaser.Math.Vector2(0, -this.accel));
            }
            if (this.moveKeys.down.isDown) {
                (<any>this.player).applyForce(new Phaser.Math.Vector2(0, this.accel));
            }
            if (this.moveKeys.left.isDown) {
                (<any>this.player).applyForce(new Phaser.Math.Vector2(-this.accel, 0));
            }
            if (this.moveKeys.right.isDown) {
                (<any>this.player).applyForce(new Phaser.Math.Vector2(this.accel, 0));
            }

            if (this.player.followingMouse) {
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.player.mouseTarget.x, this.player.mouseTarget.y);
                const physicsDelta = this.matter.world.getDelta(time, delta);
                // console.log(dist, this.topSpeed * physicsDelta / 100 * 1.1);
                const currSpeed = this.player.body.speed;
                // console.log('followingMouse', currSpeed, dist, currSpeed * (physicsDelta / 10));

                if (dist > currSpeed * (physicsDelta / 10)) {
                    // this.matter.moveTo(this.plane, this.plane.mouseTarget.x, this.plane.mouseTarget.y, this.topSpeed);
                    const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y);
                    const direction = new Phaser.Math.Vector2(this.player.mouseTarget.x, this.player.mouseTarget.y).subtract(playerPos);
                    direction.scale(this.topSpeed / direction.length());
                    (<any>this.player).setVelocity(direction.x, direction.y);
                } else {
                    // console.log('snap');

                    (<any>this.player).setVelocity(0, 0);
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


    private onEnemyCanShoot(enemy: Enemy): void {
        if (this.gameIsOver) return;
        const bullet = this.makeEnemyBullet('enemy_bullet',
            enemy.x, enemy.y + 20,
            "spaceshooter", 'laserRed05',
            this.enemyBulletSpeed, 180
        );

        this.bulletList.push(bullet);
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

        const partContainer = this.add.container(x, y, []);
        const partWing = this.add.sprite(0, 0, 'spaceshooterExt', 'spaceShips_002');
        const partHP = this.makeHPBar(0, 20, 30, 4);

        partContainer.add(partWing
            .setOrigin(0.5, 0.5)
            .setScale(this.wingManScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setTint(0xCCCCCC)
        );

        partContainer.add(partHP
            //
        );

        const enemy: Enemy = <Enemy>this.matter.add.gameObject(partContainer, { shape: { type: 'rectangle', width: 40, height: 30 } });

        enemy.hp = this.enemyHP;
        enemy.maxHP = this.enemyHP;
        enemy.partWing = partWing;
        enemy.partHP = partHP;

        this.enemyList.push(enemy);



        enemy.setName('enemy');
        enemy
            .setMass(this.mass)
            .setFrictionAir(0)
            .setFrictionStatic(0)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.ENEMY)
            .setCollidesWith(collisionCategory.PLAYER_BULLET | collisionCategory.PLAYER | collisionCategory.PLAYER_PART)
            ;
        // makeHPBar later

        enemy.setVelocity(0, 2);

        enemy.canShootEvent = this.time.addEvent({ delay: this.enemyShootRate, callback: () => this.onEnemyCanShoot(enemy), loop: true });

        enemy.bowOutEvent = this.time.addEvent({
            delay: 20 * 1000, loop: false, callback: () => {
                enemy.canShootEvent.destroy();
                enemy.bowOutEvent.destroy();
                this.enemyList.splice(this.enemyList.indexOf(enemy), 1);
                enemy.destroy();
            }
        });
        enemy.takeDamage = (amount: number) => {
            enemy.hp -= amount;
            enemy.partWing.setTint(0xffffFF);
            this.updateHPBar(enemy.partHP, enemy.hp, enemy.maxHP, 0, 0);

            enemy.undoTintEvent = this.time.addEvent({
                delay: 10, loop: false, callback: () => {
                    enemy.partWing.setTint(0xCCCCCC);
                }
            });

            if (enemy.hp <= 0) {
                this.score += this.powerLevel * enemy.maxHP;
                if (enemy.undoTintEvent) enemy.undoTintEvent.destroy();
                this.makeExplosion1(enemy.x, enemy.y);
                if (Math.random() <= this.partSpawnChance) {
                    this.makePart(
                        enemy.x, enemy.y,
                        this.partScatterLife, true
                    );
                }
                enemy.bowOutEvent.destroy();
                enemy.canShootEvent.destroy();
                this.enemyList.splice(this.enemyList.indexOf(enemy), 1);
                this.killCount[this.killCount.length - 1]++;
                this.totalKill++;
                enemy.destroy();
                this.cameras.main.shake(50, 0.02, false);
            }
        }

        enemy.onHitPlayerPart = (enemy: any, playerPart: Part, contactPoints: { vertex: { x: number, y: number } }[]) => {
            this.displayDamage(playerPart.x, playerPart.y, '-3', 3000);
            playerPart.takeDamage(3);

            this.displayDamage(enemy.x, enemy.y, '-10', 3000);
            this.crashDamage += 10;
            if (enemy.takeDamage) enemy.takeDamage(10);

            contactPoints.forEach((contactPoint) => {
                this.makeSpark(contactPoint.vertex.x, contactPoint.vertex.y)
            });
        };
        enemy.onHitPlayer = (enemy: any, player: Player, contactPoints: { vertex: { x: number, y: number } }[]) => {
            this.displayDamage(player.x, player.y, '-6', 3000);
            player.takeDamage(6);

            this.displayDamage(enemy.x, enemy.y, '-10', 3000);
            this.crashDamage += 10;
            if (enemy.takeDamage) enemy.takeDamage(10);

            contactPoints.forEach((contactPoint) => {
                this.makeSpark(contactPoint.vertex.x, contactPoint.vertex.y)
            });
        };


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
            bullet.bowOutEvent.destroy();
            this.bulletList.splice(this.bulletList.indexOf(bullet), 1);
            bullet.destroy();
        }

        bullet.onHitEnemy = (enemy: Enemy, contactPoints: { vertex: { x: number, y: number } }[]) => {
            this.displayDamage(enemy.x, enemy.y, '-1', 3000);
            if (enemy.takeDamage) enemy.takeDamage(1);
            contactPoints.forEach((contactPoint) => {
                this.makeSpark(contactPoint.vertex.x, contactPoint.vertex.y)
            });
            destroyBullet();
        }
        return bullet
    }


    private makeEnemyBullet(
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
            bullet.bowOutEvent.destroy();
            this.bulletList.splice(this.bulletList.indexOf(bullet), 1);
            bullet.destroy();
        }

        bullet.onHitPlayer = (bullet: EnemyBullet, player: Player, contactPoints: { vertex: { x: number, y: number } }[]) => {
            this.displayDamage(player.x, player.y, '-3', 3000);
            if (player.takeDamage) player.takeDamage(3);
            contactPoints.forEach((contactPoint) => {
                this.makeSpark(contactPoint.vertex.x, contactPoint.vertex.y)
            });
            destroyBullet();
        }


        bullet.onHitPlayerPart = (bullet: EnemyBullet, part: Part, contactPoints: { vertex: { x: number, y: number } }[]) => {
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
        const wingName = <string>Phaser.Utils.Array.GetRandom([
            'spaceParts_001',
            'spaceParts_002',
            'spaceParts_003',
            'spaceParts_004',
            'spaceParts_005',
            'spaceParts_006',
            'spaceParts_007',
            'spaceParts_008',
            'spaceParts_009',
        ]);
        const gunName = <string>Phaser.Utils.Array.GetRandom([
            // 'gun00',
            // 'gun01',
            // 'gun02',
            // 'gun03',
            // 'gun04',
            // 'gun05',
            // 'gun06',
            // 'gun07',
            'gun08',
            // 'gun09',
            // 'gun10',
        ]);
        const gunOffset0 = 5;
        const gunOffset = {
            x: Phaser.Math.FloatBetween(-gunOffset0, gunOffset0),
            y: Phaser.Math.FloatBetween(-gunOffset0, gunOffset0) - 10,
        };

        const partContainer = this.add.container(x, y, []);
        const partWing = this.add.sprite(0, 0, 'spaceshooterExt', wingName);
        const partGun = this.add.sprite(0, 0, 'spaceshooter', gunName);
        const partHP = this.makeHPBar(0, 0, this.partRadius * 1.2, 4);

        partContainer.add(partGun
            .setX(gunOffset.x)
            .setY(gunOffset.y)
            .setAngle(Phaser.Math.FloatBetween(-this.bodyAngle, this.bodyAngle))
            .setOrigin(0.5, 0.5)
            .setScale(this.wingManScale * 1.5)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
        );

        partContainer.add(partWing
            .setOrigin(0.5, 0.5)
            .setTint(0xAAAAAA)
            .setScale(this.wingManScale * 1.5)
            .setAngle(Phaser.Math.FloatBetween(0, 359))
            .setScaleMode(Phaser.ScaleModes.NEAREST)
        );

        partContainer.add(partHP
        );

        const part: Part = <Phaser.GameObjects.Container>this.matter.add.gameObject(partContainer, { shape: { type: 'circle', radius: this.partRadius } });

        part.partWing = partWing;
        part.partGun = partGun;
        part.partHP = partHP;

        this.partList.push(part);
        // console.log(this.wingManList);

        part.setName('part');

        (<any>part)
            .setMass(this.mass)
            .setFrictionAir(0)
            .setFrictionStatic(0)
            .setBounce(1)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.PART)
            .setCollidesWith(collisionCategory.WORLD | collisionCategory.PLAYER | collisionCategory.PART | collisionCategory.PLAYER_PART)
            ;


        if (timeToLive > -1) {
            part.destroyTimer = this.time.addEvent({
                delay: (timeToLive > 2000 ? timeToLive - 2000 : timeToLive * 0.2), callback: () => {
                    part.setAlpha(0.5);

                    part.destroyTimer = this.time.addEvent({
                        delay: (timeToLive > 2000 ? 2000 : timeToLive * 0.5), callback: () => {
                            destroyPart();
                        }
                    });
                }
            });
        }


        const destroyPart = () => {
            if (part.destroyTimer) part.destroyTimer.destroy();
            this.partList.splice(this.partList.indexOf(part), 1);
            this.makeExplosion2(part.x, part.y);
            part.destroy();
        }

        if (doScatter) {
            const velocity = Phaser.Math.Rotate({ x: 0, y: this.partScatterSpeed }, Phaser.Math.FloatBetween(-Math.PI / 2, Math.PI / 2));
            (<any>part).setVelocity(velocity.x, velocity.y);
        }

    }

    private makeHPBar(x: number, y: number, width: number, height: number): Phaser.GameObjects.Graphics {
        const bar: HPBar = this.add.graphics()
        bar
            .setX(x)
            .setY(y)
            ;
        bar.barWidth = width;
        bar.barHeight = height;
        return bar;
    }

    private updateHPBar(bar: HPBar, hp: number, maxHP: number, en: number, maxEN: number) {
        bar.clear();
        const width = bar.barWidth;
        const height = bar.barHeight;

        const hue = (hp / maxHP * 120 / 360);
        const color = Phaser.Display.Color.HSLToColor(hue, 1, 0.5).color;

        bar.lineStyle(1, color, 1);
        bar.strokeRect(-width / 2, -height / 2, width, height);

        bar.fillStyle(color, 1);
        bar.fillRect(-width / 2, -height / 2, hp / maxHP * width, height);
    }

    private makeSpark(
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
            spark.bowOutEvent.destroy();
            spark.destroy();
        }

        return spark
    }


    private makeExplosion1(
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
            explosion.bowOutEvent.destroy();
            explosion.destroy();
        }

        return explosion;
    }


    private makeExplosion2(
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
            explosion.bowOutEvent.destroy();
            explosion.destroy();
        }

        return explosion;
    }

    private makeExplosion3(
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
            explosion.bowOutEvent.destroy();
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

    private displayDamage(x: number, y: number, msg: string, duration: number) {
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
    private attachPart(parent: any, part: any, dx: number, dy: number) {

        (<Phaser.Physics.Matter.Sprite>part).setVelocity(0);
        part.setName('player_part').setAlpha(1);
        part
            .setCircle(15, {})
            .setFixedRotation()
            .setMass(this.mass / 400)
            .setX(parent.x + dx)
            .setY(parent.y + dy)
            ;
        part.hp = this.partHP;
        part.maxHP = this.partHP;
        part.onHitPart = this.onPlayerHitPart;
        part
            .setCollisionCategory(collisionCategory.PLAYER_PART)
            ;


        part.takeDamage = (amount: number) => {
            part.hp -= amount;

            const wing = part.partWing;
            wing.setTint(0xff0000);
            this.updateHPBar(part.partHP, part.hp, part.maxHP, 0, 0);

            part.undoTintEvent = this.time.addEvent({
                delay: 200, loop: false, callback: () => {
                    wing.setTint(0xAAAAAA);
                }
            });

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

    private recursiveDetachPart(part: Part) {
        const byeByeList = this.constraintList.filter((constraint: any) => constraint.bodyA.id === part.body.id);
        byeByeList.forEach((constraint: any) => this.recursiveDetachPart(constraint.bodyB.gameObject));

        const constraint = this.constraintList.find((constraint: any) => constraint.bodyB.id === part.body.id);
        const bodyA: Part = (<any>constraint).bodyA;
        const bodyB: Part = (<any>constraint).bodyB;
        this.matter.world.removeConstraint(constraint, false);
        this.constraintList.splice(this.constraintList.indexOf(constraint), 1);

        (<any>part)
            .setName('part')
            .setMass(this.mass)
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

    /**
     * @todo change any back to Phaser.Physics.Matter.*
     */
    private onPlayerHitPart(parent: any, part: Part, contactPoints: { vertex: { x: number, y: number } }[]) {
        // debugger;
        const displacement = new Phaser.Math.Vector2(part.x, part.y).subtract(
            new Phaser.Math.Vector2(parent.x, parent.y)
        );

        this.attachPart(parent, part, displacement.x, displacement.y);
    }



    private registerCollisionEvents(): void {
        this.matter.world.on('collisionstart', (event: any, bodyA: any, bodyB: any) => {
            const { pairs } = event;
            pairs.forEach((pair: any) => {
                const bodyA: any = pair.bodyA;
                const bodyB: any = pair.bodyB;
                const activeContacts: any = pair.activeContacts;

                // player_bullet vs enemy
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                // console.log('collision', bodyA.gameObject.name, bodyB.gameObject.name);
                if (bodyA.gameObject.name === 'player_bullet' && bodyB.gameObject.name === 'enemy') {
                    (<PlayerBullet>bodyA.gameObject).onHitEnemy(bodyB.gameObject, activeContacts);
                }
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyB.gameObject.name === 'player_bullet' && bodyA.gameObject.name === 'enemy') {
                    (<PlayerBullet>bodyB.gameObject).onHitEnemy(bodyA.gameObject, activeContacts);
                }

                // enemy vs player_part
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyA.gameObject.name === 'enemy' && bodyB.gameObject.name === 'player_part') {
                    (<Enemy>bodyA.gameObject).onHitPlayerPart(bodyA.gameObject, bodyB.gameObject, activeContacts);
                }
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyB.gameObject.name === 'enemy' && bodyA.gameObject.name === 'player_part') {
                    (<Enemy>bodyB.gameObject).onHitPlayerPart(bodyB.gameObject, bodyA.gameObject, activeContacts);
                }

                // enemy vs player
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyA.gameObject.name === 'enemy' && bodyB.gameObject.name === 'player') {
                    (<Enemy>bodyA.gameObject).onHitPlayer(bodyA.gameObject, bodyB.gameObject, activeContacts);
                }
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyB.gameObject.name === 'enemy' && bodyA.gameObject.name === 'player') {
                    (<Enemy>bodyB.gameObject).onHitPlayer(bodyB.gameObject, bodyA.gameObject, activeContacts);
                }

                // enemy_bullet vs player
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyA.gameObject.name === 'enemy_bullet' && bodyB.gameObject.name === 'player') {
                    (<Enemy>bodyA.gameObject).onHitPlayer(bodyA.gameObject, bodyB.gameObject, activeContacts);
                }
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyB.gameObject.name === 'enemy_bullet' && bodyA.gameObject.name === 'player') {
                    (<Enemy>bodyB.gameObject).onHitPlayer(bodyB.gameObject, bodyA.gameObject, activeContacts);
                }

                // enemy_bullet vs player_part
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyA.gameObject.name === 'enemy_bullet' && bodyB.gameObject.name === 'player_part') {
                    (<Enemy>bodyA.gameObject).onHitPlayerPart(bodyA.gameObject, bodyB.gameObject, activeContacts);
                }
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyB.gameObject.name === 'enemy_bullet' && bodyA.gameObject.name === 'player_part') {
                    (<Enemy>bodyB.gameObject).onHitPlayerPart(bodyB.gameObject, bodyA.gameObject, activeContacts);
                }
                // player vs part
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyA.gameObject.name === 'player' && bodyB.gameObject.name === 'part') {
                    (<Player>bodyA.gameObject).onHitPart(bodyA.gameObject, bodyB.gameObject, activeContacts);
                }
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyB.gameObject.name === 'player' && bodyA.gameObject.name === 'part') {
                    (<Player>bodyB.gameObject).onHitPart(bodyB.gameObject, bodyA.gameObject, activeContacts);
                }

                // player_part vs part
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyA.gameObject.name === 'player_part' && bodyB.gameObject.name === 'part') {
                    (<Player>bodyA.gameObject).onHitPart(bodyA.gameObject, bodyB.gameObject, activeContacts);
                }
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyB.gameObject.name === 'player_part' && bodyA.gameObject.name === 'part') {
                    (<Player>bodyB.gameObject).onHitPart(bodyB.gameObject, bodyA.gameObject, activeContacts);
                }
            });
        });
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

            (<any>this.player).setCollisionCategory(0);
            (<any>this.partList).forEach((part: any) => part.setCollisionCategory(0));
            this.gameIsOver = true;
            this.time.addEvent({ delay: 4000, callback: () => (<any>this.player).setVelocityY(-6).setFrictionAir(0).setFrictionStatic(0) });

        } else {
            const diffWave: IDifficultyWave = diff;
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
