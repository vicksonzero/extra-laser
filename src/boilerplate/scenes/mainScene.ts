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

export class MainScene extends Phaser.Scene {

    private topSpeed: number = 250;
    private accel: number = 7 * 2;
    private mass = 3000;
    private drag: number = 0.2;


    private plane: Plane;
    private moveKeys: IMoveKeys;
    private shootTimerEvent: Phaser.Time.TimerEvent;

    private bullets: Phaser.Physics.Matter.Sprite[] = [];
    private wingMen: Phaser.Physics.Matter.Sprite[] = [];

    constructor() {
        super({
            key: "MainScene"
        });

        bindAll(this, [
            'onCanShoot'
        ]);
    }

    preload(): void {
        this.load.atlasXML('spaceshooter', './assets/kenney/sheet.png', './assets/kenney/sheet.xml');
    }

    create(): void {
        this.matter.world.setBounds(0, 0, +this.sys.game.config.width, +this.sys.game.config.height);
        this.plane = this.matter.add.sprite(150, 300, "spaceshooter", 'playerShip1_blue');
        this.plane
            .setOrigin(0.5, 0.5)
            .setScale(0.5, 0.5)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setIgnoreGravity(true)
            .setMass(this.mass / 4)
            .setFrictionAir(this.drag)
            .setFixedRotation()

        const wing1 = this.matter.add.sprite(50, 300, "spaceshooter", 'playerShip2_blue');
        this.wingMen.push(wing1);
        wing1
            .setOrigin(0.5, 0.5)
            .setScale(0.3, 0.3)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setIgnoreGravity(true)
            .setMass(this.mass / 4)
            .setFrictionAir(this.drag)
            .setFixedRotation()

        this.matter.add.joint(this.plane, wing1, 0, 1, {
            pointA: { x: -50, y: 0 },
        });

        const wing2 = this.matter.add.sprite(250, 300, "spaceshooter", 'playerShip2_blue');
        this.wingMen.push(wing2);
        wing2
            .setOrigin(0.5, 0.5)
            .setScale(0.3, 0.3)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setIgnoreGravity(true)
            .setMass(this.mass)
            .setFrictionAir(this.drag)
            .setFixedRotation()

        this.matter.add.joint(this.plane, wing2, 0, 1, {
            pointA: { x: 50, y: 0 },
        });

        this.shootTimerEvent = this.time.addEvent({ delay: 150, callback: this.onCanShoot, callbackScope: this, loop: true });

        this.registerKeyboard();
        this.registerMouse();
    }

    update(time, delta: number): void {

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

        // if (this.plane.followingMouse) {
        //     const dist = Phaser.Math.Distance.Between(this.plane.x, this.plane.y, this.plane.mouseTarget.x, this.plane.mouseTarget.y);
        //     if (dist > this.topSpeed * delta / 1000) {
        //         this.physics.moveTo(this.plane, this.plane.mouseTarget.x, this.plane.mouseTarget.y, this.topSpeed);
        //     } else {
        //         this.plane.setPosition(this.plane.mouseTarget.x, this.plane.mouseTarget.y);
        //     }
        // }
        // Constrain velocity of player
        // this.constrainVelocity(this.plane, this.topSpeed);

    }

    private onCanShoot(): void {
        const bullet = this.matter.add.sprite(this.plane.x, this.plane.y - 20, "spaceshooter", 'laserBlue07');
        this.bullets.push(bullet);
        (bullet
            .setOrigin(0.5, 0.5)
            .setScale(0.5, 0.5)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setVelocity(0, -20)
            .setIgnoreGravity(true)
            .setFixedRotation()
        );
        this.time.addEvent({
            delay: 1000, loop: false, callback: () => {
                bullet.destroy();
                this.bullets.splice(this.bullets.indexOf(bullet), 1)
                console.log(this.bullets);

            }
        });


        this.wingMen.forEach(wingMan => this.doWingManShoot(wingMan));
    }

    private doWingManShoot(wingMan: Phaser.Physics.Matter.Sprite) {
        const gunPos = { x: 20, y: -10 };
        const gunAngle = { x: -1, y: 0 };
        const bullet1 = this.matter.add.sprite(wingMan.x - gunPos.x, wingMan.y + gunPos.y, "spaceshooter", 'laserBlue07');
        this.bullets.push(bullet1);
        (bullet1
            .setOrigin(0.5, 0.5)
            .setScale(0.5, 0.5)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setVelocity(0 + gunAngle.x, -20 + gunAngle.y)
            .setIgnoreGravity(true)
            .setFixedRotation()
        );
        this.time.addEvent({
            delay: 1000, loop: false, callback: () => {
                bullet1.destroy();
                this.bullets.splice(this.bullets.indexOf(bullet1), 1)

            }
        });
        const bullet2 = this.matter.add.sprite(wingMan.x + gunPos.x, wingMan.y + gunPos.y, "spaceshooter", 'laserBlue07');
        this.bullets.push(bullet2);
        (bullet2
            .setOrigin(0.5, 0.5)
            .setScale(0.5, 0.5)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setVelocity(0 - gunAngle.x, -20 + gunAngle.y)
            .setIgnoreGravity(true)
            .setFixedRotation()
        );
        this.time.addEvent({
            delay: 1000, loop: false, callback: () => {
                bullet2.destroy();
                this.bullets.splice(this.bullets.indexOf(bullet2), 1)

            }
        });
    }

    // Ensures sprite speed doesnt exceed maxVelocity while update is called
    private constrainVelocity(sprite, maxVelocity) {
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

    private registerKeyboard(): void {

        // Creates object for input with WASD kets
        this.moveKeys = this.input.keyboard.addKeys({
            'up': Phaser.Input.Keyboard.KeyCodes.W,
            'down': Phaser.Input.Keyboard.KeyCodes.S,
            'left': Phaser.Input.Keyboard.KeyCodes.A,
            'right': Phaser.Input.Keyboard.KeyCodes.D
        }) as IMoveKeys;


        // Stops player acceleration on uppress of WASD keys
        this.input.keyboard.on('keyup_W', (event) => {
            if (this.moveKeys.down.isUp) {
                // this.plane.setAccelerationY(0);
            }
        });
        this.input.keyboard.on('keyup_S', (event) => {
            if (this.moveKeys.up.isUp) {
                // this.plane.setAccelerationY(0);
            }
        });
        this.input.keyboard.on('keyup_A', (event) => {
            if (this.moveKeys.right.isUp) {
                // this.plane.setAccelerationX(0);
            }
        });
        this.input.keyboard.on('keyup_D', (event) => {
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
        // this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        //     // cursor.setVisible(true).setPosition(pointer.x, pointer.y);
        //     // this.physics.moveToObject(this.plane, pointer, 240);
        // });

    }
}
