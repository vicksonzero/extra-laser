import { bindAll } from 'lodash';

interface IMoveKeys {
    down: Phaser.Input.Keyboard.Key,
    up: Phaser.Input.Keyboard.Key,
    right: Phaser.Input.Keyboard.Key,
    left: Phaser.Input.Keyboard.Key,
}

interface Plane extends Phaser.Physics.Matter.Sprite {
    mouseTarget?: Phaser.Input.Pointer;
    followingMouse?: boolean;
}
interface PlayerBullet extends Phaser.Physics.Matter.Sprite {
    onHitEnemy?: (enemy: Enemy) => void;
    birthdayEvent?: Phaser.Time.TimerEvent;
}

interface Enemy extends Phaser.Physics.Matter.Sprite {
    hp?: number;
    maxHp?: number;
    takeDamage?: (amount: number) => void;
}

enum collisionCategory {
    WORLD = 1 << 0,
    PLAYER = 1 << 1,
    PLAYER_BULLET = 1 << 2,
    ENEMY = 1 << 3,
    ENEMY_BULL = 1 << 4,
}

export class MainScene extends Phaser.Scene {

    // movement
    private topSpeed: number = 15;
    private accel: number = 7 * 2;
    private mass = 3000;
    private drag: number = 0.2;

    // sizes
    private playerScale: number = 0.3;
    private wingManScale: number = 0.4;
    private enemyScale: number = 0.5;
    private bulletScale: number = 0.5;

    // linkage
    private linkageDistance: number = 0.5;
    private linkageStiffness: number = 0.2;
    private linkageDamping: number = 0.01;

    // display objects
    private plane: Plane;
    private moveKeys: IMoveKeys;

    // display objects list
    private bulletList: PlayerBullet[] = [];
    private wingManList: Phaser.Physics.Matter.Sprite[] = [];
    private enemyList: Enemy[] = [];

    // timers
    private shootTimerEvent: Phaser.Time.TimerEvent;
    private spawnENemyTimerEvent: Phaser.Time.TimerEvent;

    constructor() {
        super({
            key: "MainScene"
        });

        bindAll(this, [
            'onCanShoot',
            'onCanSpawnEnemy',
        ]);
    }

    preload(): void {
        this.load.atlasXML('spaceshooter', './assets/kenney/sheet.png', './assets/kenney/sheet.xml');
        this.load.atlasXML('spaceshooterExt', './assets/kenney/spaceShooter2_spritesheet.png', './assets/kenney/spaceShooter2_spritesheet.xml');
    }

    create(): void {
        (<any>window).scene = this;

        this.matter.world
            .setBounds(0, 0, +this.sys.game.config.width, +this.sys.game.config.height)
            .disableGravity()
            ;
        this.plane = this.matter.add.sprite(150, 300, "spaceshooter", 'playerShip1_blue');
        this.plane.setName('player');
        this.plane
            .setOrigin(0.5, 0.5)
            .setScale(this.playerScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setMass(this.mass / 4)
            .setFrictionAir(this.drag)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.PLAYER)
            .setCollidesWith(collisionCategory.WORLD | collisionCategory.ENEMY | collisionCategory.ENEMY_BULL)
            ;

        const wing1 = this.matter.add.sprite(50, 300, "spaceshooter", 'playerShip2_blue');
        this.wingManList.push(wing1);
        wing1.setName('wing1');
        wing1
            .setOrigin(0.5, 0.5)
            .setScale(this.wingManScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setMass(this.mass / 4)
            .setFrictionAir(this.drag)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.PLAYER)
            .setCollidesWith(collisionCategory.WORLD | collisionCategory.ENEMY | collisionCategory.ENEMY_BULL)
            ;

        this.matter.add.joint(this.plane, wing1, this.linkageDistance, this.linkageStiffness, {
            pointA: { x: -50, y: 0 },
            damping: this.linkageDamping,
        });

        const wing2 = this.matter.add.sprite(250, 300, "spaceshooter", 'playerShip2_blue');
        this.wingManList.push(wing2);
        wing2.setName('wing2');
        wing2
            .setOrigin(0.5, 0.5)
            .setScale(this.wingManScale)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setMass(this.mass)
            .setFrictionAir(this.drag)
            .setFixedRotation()
            .setCollisionCategory(collisionCategory.PLAYER)
            .setCollidesWith(collisionCategory.WORLD | collisionCategory.ENEMY | collisionCategory.ENEMY_BULL)

        this.matter.add.joint(this.plane, wing2, this.linkageDistance, this.linkageStiffness, {
            pointA: { x: 50, y: 0 },
            damping: this.linkageDamping,
        });


        this.shootTimerEvent = this.time.addEvent({ delay: 150, callback: this.onCanShoot, loop: true });
        this.spawnENemyTimerEvent = this.time.addEvent({ delay: 150, callback: this.onCanSpawnEnemy, loop: true });

        this.registerKeyboard();
        this.registerMouse();
        this.registerCollisionEvents();
    }

    update(time: number, delta: number): void {
        const MATTER_STEP = 16.666;

        // Enables movement of player with WASD keys
        if (this.moveKeys.up.isDown) {
            this.plane.applyForce(new Phaser.Math.Vector2(0, -this.accel));
        }
        if (this.moveKeys.down.isDown) {
            this.plane.applyForce(new Phaser.Math.Vector2(0, this.accel));
        }
        if (this.moveKeys.left.isDown) {
            this.plane.applyForce(new Phaser.Math.Vector2(-this.accel, 0));
        }
        if (this.moveKeys.right.isDown) {
            this.plane.applyForce(new Phaser.Math.Vector2(this.accel, 0));
        }

        if (this.plane.followingMouse) {
            const dist = Phaser.Math.Distance.Between(this.plane.x, this.plane.y, this.plane.mouseTarget.x, this.plane.mouseTarget.y);
            const physicsDelta = this.matter.world.getDelta(time, delta);
            // console.log(dist, this.topSpeed * physicsDelta / 100 * 1.1);

            if (dist > this.topSpeed * physicsDelta / 100 * 1.1) {
                // this.matter.moveTo(this.plane, this.plane.mouseTarget.x, this.plane.mouseTarget.y, this.topSpeed);
                const playerPos = new Phaser.Math.Vector2(this.plane.x, this.plane.y);
                const direction = new Phaser.Math.Vector2(this.plane.mouseTarget.x, this.plane.mouseTarget.y).subtract(playerPos);
                direction.scale(this.topSpeed / direction.length());
                this.plane.setVelocity(direction.x, direction.y);
            } else {
                this.plane.setPosition(this.plane.mouseTarget.x, this.plane.mouseTarget.y);
            }
        }
        // Constrain velocity of player
        // this.constrainVelocity(this.plane, this.topSpeed);

    }

    private onCanShoot(): void {
        const bullet = this.makeBullet('player_bullet',
            this.plane.x, this.plane.y - 20,
            "spaceshooter", 'laserBlue07',
            { x: 0, y: -20 }
        );

        this.bulletList.push(bullet);
        this.wingManList.forEach(wingMan => this.doWingManShoot(wingMan));
    }

    private onCanSpawnEnemy() {
        const shipWidth = 50;
        const x = Phaser.Math.Between(shipWidth, +this.sys.game.config.width - shipWidth);
        const y = 0;
        this.spawnEnemy(x, y);
    }

    private spawnEnemy(x: number, y: number) {
        const enemy: Enemy = this.matter.add.sprite(x, y, "spaceshooterExt", 'spaceShips_002');
        enemy.hp = 3;
        enemy.maxHp = 3;
        this.enemyList.push(enemy);
        enemy.setName('enemy');
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
            if (enemy.hp <= 0) {
                enemy.destroy();
                this.enemyList.splice(this.enemyList.indexOf(enemy), 1);
            }
        }
    }

    private doWingManShoot(wingMan: Phaser.Physics.Matter.Sprite) {
        const gunPos = { x: 20, y: -10 };
        const gunAngle = { x: -1, y: 0 };
        const bullet1 = this.makeBullet('player_bullet',
            wingMan.x - gunPos.x, wingMan.y + gunPos.y,
            "spaceshooter", 'laserBlue07',
            { x: 0 + gunAngle.x, y: -20 + gunAngle.y }
        )
        this.bulletList.push(bullet1);

        const bullet2 = this.makeBullet('player_bullet',
            wingMan.x + gunPos.x, wingMan.y + gunPos.y,
            "spaceshooter", 'laserBlue07',
            { x: 0 - gunAngle.x, y: - 20 + gunAngle.y }
        );
        this.bulletList.push(bullet2);
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

    private makeBullet(
        name: string,
        x: number, y: number,
        key: string, frameName: string,
        velocity: { x: number, y: number }
    ): PlayerBullet {
        const bullet = <PlayerBullet>this.matter.add.sprite(
            x, y,
            key, frameName
        );
        bullet.setName('player_bullet');

        this.bulletList.push(bullet);
        (bullet
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

        bullet.onHitEnemy = (enemy: Enemy) => {
            if (enemy.takeDamage) enemy.takeDamage(1);
            destroyBullet();
        }
        return bullet
    }

    private registerCollisionEvents(): void {
        this.matter.world.on('collisionstart', (event: any, bodyA: any, bodyB: any) => {
            const { pairs } = event;
            pairs.forEach((pair: any) => {
                const bodyA: any = pair.bodyA;
                const bodyB: any = pair.bodyB;
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyA.gameObject.name === 'player_bullet' && bodyB.gameObject.name === 'enemy') {
                    (<PlayerBullet>bodyA.gameObject).onHitEnemy(bodyB.gameObject);
                }
                if (!(bodyA.gameObject && bodyB.gameObject)) return;
                if (bodyB.gameObject.name === 'player_bullet' && bodyA.gameObject.name === 'enemy') {
                    (<PlayerBullet>bodyB.gameObject).onHitEnemy(bodyA.gameObject);
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
            this.plane.followingMouse = true;
            this.plane.mouseTarget = pointer;
        });
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            this.plane.followingMouse = false;
        });
    }
}
