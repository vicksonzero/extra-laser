import { bindAll } from 'lodash';

interface IMoveKeys {
    down: Phaser.Input.Keyboard.Key,
    up: Phaser.Input.Keyboard.Key,
    right: Phaser.Input.Keyboard.Key,
    left: Phaser.Input.Keyboard.Key,
}

interface Player extends Phaser.Physics.Matter.Sprite {
    mouseTarget?: Phaser.Input.Pointer;
    followingMouse?: boolean;
    onHitPart?: (parent: any, part: Part, contactPoints: { vertex: { x: number, y: number } }[]) => void;
}
interface PlayerBullet extends Phaser.Physics.Matter.Sprite {
    onHitEnemy?: (enemy: Enemy, contactPoints: { vertex: { x: number, y: number } }[]) => void;
    birthdayEvent?: Phaser.Time.TimerEvent;
}

interface Part extends Phaser.GameObjects.Container {
    container?: PartContainer;
    partWing?: Phaser.GameObjects.GameObject;
    partGun?: Phaser.GameObjects.GameObject;
    onHitPart?: (parent: any, part: Part, contactPoints: { vertex: { x: number, y: number } }[]) => void;
    destroyTimer?: Phaser.Time.TimerEvent;
}

interface PartContainer extends Phaser.GameObjects.Container {

}



interface Effect extends Phaser.GameObjects.Sprite {
    birthdayEvent?: Phaser.Time.TimerEvent;
}
interface Star extends Phaser.Physics.Matter.Sprite {
    birthdayEvent?: Phaser.Time.TimerEvent;
}

interface Enemy extends Phaser.Physics.Matter.Sprite {
    hp?: number;
    maxHp?: number;
    takeDamage?: (amount: number) => void;
    tintFill?: boolean;
    undoTintEvent?: Phaser.Time.TimerEvent;
}

enum collisionCategory {
    WORLD = 1 << 0,
    PLAYER = 1 << 1,
    PLAYER_BULLET = 1 << 2,
    ENEMY = 1 << 3,
    ENEMY_BULL = 1 << 4,
    STAR = 1 << 5,
    PART = 1 << 6,
    PLAYER_PART = 1 << 7,
}


export class MainScene extends Phaser.Scene {

    // movement
    private topSpeed: number = 6;
    private accel: number = 4;
    private mass = 3000;
    private drag: number = 0.2;
    private playerBulletRapid = 150;

    private enemySpawnRate = 350;
    private starsSpawnRate = 1000;


    private partSpawnChance = 0.1;
    private partHP = 6;
    private partAngle = 20;
    private partScatterSpeed = 3;
    private partScatterLife = 10 * 1000;

    // sizes
    private playerScale: number = 0.3;
    private wingManScale: number = 0.4;
    private enemyScale: number = 0.5;
    private bulletScale: number = 0.5;

    // linkage
    private linkageDistance: number = 0.5;
    private linkageStiffness: number = 0.6;
    private linkageDamping: number = 0.01;

    // display objects
    private player: Player;
    private moveKeys: IMoveKeys;

    // display objects list
    private bulletList: PlayerBullet[] = [];
    private wingManList: any[] = []; /** @todo remove any */
    private enemyList: Enemy[] = [];

    // timers
    private shootTimerEvent: Phaser.Time.TimerEvent;
    private spawnEnemyTimerEvent: Phaser.Time.TimerEvent;
    private spawnStarsTimerEvent: Phaser.Time.TimerEvent;

    constructor() {
        super({
            key: "MainScene"
        });

        bindAll(this, [
            'onCanShoot',
            'onCanSpawnEnemy',
            'onCanSpawnStars',
            'onPlayerHitPart',
        ]);
    }

    preload(): void {
        this.load.atlasXML('spaceshooter', './assets/kenney/sheet.png', './assets/kenney/sheet.xml');
        this.load.atlasXML('spaceshooterExt', './assets/kenney/spaceShooter2_spritesheet.png', './assets/kenney/spaceShooter2_spritesheet.xml');
        this.load.spritesheet('explosion1', './assets/explosion/spritesheet8.png', { frameWidth: 130, spacing: 0, margin: 0, endFrame: 24 });
    }

    create(): void {
        (<any>window).scene = this;

        this.matter.world
            .setBounds(0, 0, +this.sys.game.config.width, +this.sys.game.config.height)
            .disableGravity()
            ;
        this.player = this.matter.add.sprite(150, 300, "spaceshooter", 'playerShip1_blue');
        this.player.setName('player');
        this.player
            .setCircle(30, {})
            .setOrigin(0.5, 0.5)
            .setScale(this.playerScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setMass(this.mass / 4)
            .setFrictionAir(this.drag)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.PLAYER)
            .setCollidesWith(collisionCategory.WORLD | collisionCategory.ENEMY | collisionCategory.ENEMY_BULL | collisionCategory.PART)
            ;
        this.player.onHitPart = this.onPlayerHitPart;

        // const wing1 = this.matter.add.sprite(50, 300, "spaceshooter", 'playerShip2_blue');
        // this.wingManList.push(wing1);
        // wing1.setName('wing1');
        // wing1
        //     .setOrigin(0.5, 0.5)
        //     .setScale(this.wingManScale)
        //     .setScaleMode(Phaser.ScaleModes.NEAREST)
        //     .setMass(this.mass / 4)
        //     .setFrictionAir(this.drag)
        //     .setFixedRotation()
        //     .setCollisionCategory(collisionCategory.PLAYER)
        //     .setCollidesWith(collisionCategory.WORLD | collisionCategory.ENEMY | collisionCategory.ENEMY_BULL)
        //     ;

        // this.matter.add.joint(this.plane, wing1, this.linkageDistance, this.linkageStiffness, {
        //     pointA: { x: -50, y: 0 },
        //     damping: this.linkageDamping,
        // });

        // const wing2 = this.matter.add.sprite(250, 300, "spaceshooter", 'playerShip2_blue');
        // this.wingManList.push(wing2);
        // wing2.setName('wing2');
        // wing2
        //     .setOrigin(0.5, 0.5)
        //     .setScale(this.wingManScale)
        //     .setScaleMode(Phaser.ScaleModes.NEAREST)
        //     .setMass(this.mass)
        //     .setFrictionAir(this.drag)
        //     .setFixedRotation()
        //     .setCollisionCategory(collisionCategory.PLAYER)
        //     .setCollidesWith(collisionCategory.WORLD | collisionCategory.ENEMY | collisionCategory.ENEMY_BULL)

        // this.matter.add.joint(this.plane, wing2, this.linkageDistance, this.linkageStiffness, {
        //     pointA: { x: 50, y: 0 },
        //     damping: this.linkageDamping,
        // });


        this.shootTimerEvent = this.time.addEvent({ delay: this.playerBulletRapid, callback: this.onCanShoot, loop: true });
        this.spawnEnemyTimerEvent = this.time.addEvent({ delay: this.enemySpawnRate, callback: this.onCanSpawnEnemy, loop: true });
        this.spawnStarsTimerEvent = this.time.addEvent({ delay: this.starsSpawnRate, callback: this.onCanSpawnStars, loop: true });
        this.initStars();


        for (let i = 0; i < 2; i++) {
            this.makePart(
                Phaser.Math.FloatBetween(0, +this.sys.game.config.width),
                Phaser.Math.FloatBetween(0, +this.sys.game.config.height),
                true
            )
        }


        this.registerKeyboard();
        this.registerMouse();
        this.registerCollisionEvents();


        const tutorial = this.add.text((+this.sys.game.config.width) / 2, (+this.sys.game.config.height) / 2,
            `Extra Laser\n` +
            `\n` +
            `How to play:\n` +
            `Touch / Mouse / WASD`
            , { color: '#FFFFFF', align: 'center' });
        tutorial.setOrigin(0.5);

        var tween = this.tweens.add({
            targets: tutorial,
            alpha: 0,
            ease: 'Power1',
            duration: 3000,
            delay: 5000,
        });
    }

    update(time: number, delta: number): void {
        const MATTER_STEP = 16.666;

        // Enables movement of player with WASD keys
        if (this.moveKeys.up.isDown) {
            this.player.applyForce(new Phaser.Math.Vector2(0, -this.accel));
        }
        if (this.moveKeys.down.isDown) {
            this.player.applyForce(new Phaser.Math.Vector2(0, this.accel));
        }
        if (this.moveKeys.left.isDown) {
            this.player.applyForce(new Phaser.Math.Vector2(-this.accel, 0));
        }
        if (this.moveKeys.right.isDown) {
            this.player.applyForce(new Phaser.Math.Vector2(this.accel, 0));
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
                this.player.setVelocity(direction.x, direction.y);
            } else {
                // console.log('snap');

                this.player.setPosition(this.player.mouseTarget.x, this.player.mouseTarget.y);
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
        const bullet = this.makeBullet('player_bullet',
            this.player.x, this.player.y - 20,
            "spaceshooter", 'laserBlue07',
            20, 0
        );

        this.bulletList.push(bullet);
        this.wingManList.filter(wingman => wingman.name === 'player_part')
            .forEach(wingMan => this.doWingManShoot(wingMan));
    }

    private onCanSpawnEnemy() {
        const shipWidth = 50;
        const x = Phaser.Math.Between(shipWidth, +this.sys.game.config.width - shipWidth);
        const y = 0;
        this.spawnEnemy(x, y);
    }



    private initStars() {
        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(0, +this.sys.game.config.width);
            const y = Phaser.Math.Between(0, +this.sys.game.config.height);
            this.spawnStar(x, y);

        }
    }

    private onCanSpawnStars() {
        const shipWidth = 50;
        const x = Phaser.Math.Between(0, +this.sys.game.config.width);
        const y = 0;
        this.spawnStar(x, y);
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
        const enemy: Enemy = this.matter.add.sprite(x, y, "spaceshooterExt", 'spaceShips_002');
        enemy.hp = this.partHP;
        enemy.maxHp = this.partHP;
        this.enemyList.push(enemy);
        enemy.setName('enemy');
        enemy.setTint(0xCCCCCC);
        enemy
            .setOrigin(0.5, 0.5)
            .setScale(this.wingManScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setMass(this.mass)
            .setFrictionAir(0)
            .setFrictionStatic(0)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.ENEMY)
            .setCollidesWith(collisionCategory.PLAYER_BULLET | collisionCategory.ENEMY_BULL)
            ;

        enemy.setVelocity(0, 2);
        this.time.addEvent({
            delay: 20 * 1000, loop: false, callback: () => {
                enemy.destroy();
                this.bulletList.splice(this.bulletList.indexOf(enemy), 1);
            }
        });
        enemy.takeDamage = (amount: number) => {
            enemy.hp -= amount;
            enemy.setTint(0xffffFF);

            enemy.undoTintEvent = this.time.addEvent({
                delay: 10, loop: false, callback: () => {
                    enemy.setTint(0xCCCCCC);
                }
            });

            if (enemy.hp <= 0) {
                if (enemy.undoTintEvent) enemy.undoTintEvent.destroy();
                this.makeExplosion1(enemy.x, enemy.y);
                if (Math.random() <= this.partSpawnChance) {
                    this.makePart(
                        enemy.x, enemy.y,
                        true
                    );
                }
                enemy.destroy();
                this.cameras.main.shake(50, 0.01, false);

                this.enemyList.splice(this.enemyList.indexOf(enemy), 1);
            }
        }
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

        console.log('makeBullet', speed, angle, velocity);

        this.bulletList.push(bullet);
        (bullet
            .setAngle(angle)
            .setOrigin(0.5, 0.5)
            .setScale(this.bulletScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setVelocity(velocity.x, velocity.y)
            .setSensor(true)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.PLAYER_BULLET)
            .setCollidesWith(collisionCategory.ENEMY | collisionCategory.ENEMY_BULL)
        );

        bullet.birthdayEvent = this.time.addEvent({
            delay: 1000, loop: false, callback: () => {
                destroyBullet();
            }
        });

        const destroyBullet = () => {
            bullet.birthdayEvent.destroy();
            bullet.destroy();
            this.bulletList.splice(this.bulletList.indexOf(bullet), 1)
        }

        bullet.onHitEnemy = (enemy: Enemy, contactPoints: { vertex: { x: number, y: number } }[]) => {
            if (enemy.takeDamage) enemy.takeDamage(1);
            contactPoints.forEach((contactPoint) => {
                this.makeSpark(contactPoint.vertex.x, contactPoint.vertex.y)
            });
            destroyBullet();
        }
        return bullet
    }

    private makePart(
        x: number, y: number,
        doScatter: boolean
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


        partContainer.add(partGun
            .setX(gunOffset.x)
            .setY(gunOffset.y)
            .setAngle(Phaser.Math.FloatBetween(-this.partAngle, this.partAngle))
            .setOrigin(0.5, 0.5)
            .setScale(this.wingManScale * 1.5)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
        );

        partContainer.add(partWing
            .setOrigin(0.5, 0.5)
            .setScale(this.wingManScale * 1.5)
            .setAngle(Phaser.Math.FloatBetween(0, 359))
            .setScaleMode(Phaser.ScaleModes.NEAREST)
        );

        const part: Part = <Phaser.GameObjects.Container>this.matter.add.gameObject(partContainer, { shape: { type: 'circle', radius: 18 } });

        part.partWing = partWing;
        part.partGun = partGun;

        this.wingManList.push(part);
        part.setName('part');

        (<any>part)
            .setMass(this.mass / 4)
            .setFrictionAir(0)
            .setFrictionStatic(0)
            .setFixedRotation()
            .setBounce(1)
            .setCollisionCategory(collisionCategory.PART)
            .setCollidesWith(collisionCategory.WORLD | collisionCategory.PLAYER | collisionCategory.PART | collisionCategory.PLAYER_PART)
            ;



        part.destroyTimer = this.time.addEvent({
            delay: this.partScatterLife, loop: false, callback: () => {
                destroyPart();
            }
        });

        const destroyPart = () => {
            part.destroyTimer.destroy();
            part.destroy();
        }

        if (doScatter) {
            const velocity = Phaser.Math.Rotate({ x: 0, y: this.partScatterSpeed }, Phaser.Math.FloatBetween(0, Phaser.Math.PI2));
            (<any>part).setVelocity(velocity.x, velocity.y);
        }

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

        spark.birthdayEvent = this.time.addEvent({
            delay: 50, loop: false, callback: () => {
                destroySpark();
            }
        });

        const destroySpark = () => {
            spark.birthdayEvent.destroy();
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

        var config = {
            key: 'explode',
            frames: this.anims.generateFrameNumbers('explosion1', { start: 0, end: 23 }),
            frameRate: 60
        };
        this.anims.create(config);
        explosion.anims.play('explode');

        explosion.setName('explosion');

        // const color = Phaser.Display.Color.HSLToColor(Phaser.Math.FloatBetween(0, 1), 1, 0.9).color;
        (explosion
            .setOrigin(0.5, 0.4)
            .setScale(this.bulletScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            // .setTint(color)
        );

        explosion.birthdayEvent = this.time.addEvent({
            delay: 500, loop: false, callback: () => {
                destroySpark();
            }
        });

        const destroySpark = () => {
            explosion.birthdayEvent.destroy();
            explosion.destroy();
        }

        return explosion;
    }

    /**
     * @todo change any back to Phaser.Physics.Matter.*
     */
    private attachPart(parent: any, part: any, dx: number, dy: number) {

        (<Phaser.Physics.Matter.Sprite>part).setVelocity(0);
        part.setName('player_part');
        part
            .setCircle(15, {})
            .setFixedRotation()
            .setX(parent.x + dx)
            .setY(parent.y + dy)
            ;
        part.onHitPart = this.onPlayerHitPart;
        part
            .setCollisionCategory(collisionCategory.PLAYER_PART)
            ;
        if (part.destroyTimer) part.destroyTimer.destroy();


        this.matter.add.joint(parent, part, this.linkageDistance, this.linkageStiffness, {
            pointA: { x: dx, y: dy },
            damping: this.linkageDamping,
        });
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

                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                console.log('collision', bodyA.gameObject.name, bodyB.gameObject.name);
                if (bodyA.gameObject.name === 'player_bullet' && bodyB.gameObject.name === 'enemy') {
                    (<PlayerBullet>bodyA.gameObject).onHitEnemy(bodyB.gameObject, activeContacts);
                }
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyB.gameObject.name === 'player_bullet' && bodyA.gameObject.name === 'enemy') {
                    (<PlayerBullet>bodyB.gameObject).onHitEnemy(bodyA.gameObject, activeContacts);
                }

                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                console.log('collision', bodyA.gameObject.name, bodyB.gameObject.name);
                if (bodyA.gameObject.name === 'player' && bodyB.gameObject.name === 'part') {
                    (<Player>bodyA.gameObject).onHitPart(bodyA.gameObject, bodyB.gameObject, activeContacts);
                }
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyB.gameObject.name === 'player' && bodyA.gameObject.name === 'part') {
                    (<Player>bodyB.gameObject).onHitPart(bodyB.gameObject, bodyA.gameObject, activeContacts);
                }

                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                console.log('collision', bodyA.gameObject.name, bodyB.gameObject.name);
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


    // Ensures sprite speed doesnt exceed maxVelocity while update is called
    private constrainVelocity(sprite: Phaser.Physics.Matter.Sprite, maxVelocity: number) {
        if (!sprite || !sprite.body)
            return;

        var angle, currVelocitySqr, vx, vy;
        vx = sprite.body.velocity.x;
        vy = sprite.body.velocity.y;
        currVelocitySqr = vx * vx + vy * vy;

        if (currVelocitySqr > maxVelocity * maxVelocity) {
            angle = Math.atan2(vy, vx);
            vx = Math.cos(angle) * maxVelocity;
            vy = Math.sin(angle) * maxVelocity;
            sprite.body.velocity.x = vx;
            sprite.body.velocity.y = vy;
        }
    }
}
