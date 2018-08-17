

interface IMoveKeys {
    down: Phaser.Input.Keyboard.Key,
    up: Phaser.Input.Keyboard.Key,
    right: Phaser.Input.Keyboard.Key,
    left: Phaser.Input.Keyboard.Key,
}

interface Plane extends Phaser.Physics.Arcade.Sprite {
    mouseTarget?: Phaser.Input.Pointer;
    followingMouse?: boolean;
}

export class MainScene extends Phaser.Scene {
    private plane: Plane;
    private moveKeys: IMoveKeys;

    private topSpeed: number = 250;
    private accel: number = 1000;
    private drag: number = 1000;

    constructor() {
        super({
            key: "MainScene"
        });
    }

    preload(): void {
        this.load.atlasXML('spaceshooter', './assets/kenney/sheet.png', './assets/kenney/sheet.xml');
    }

    create(): void {
        this.plane = this.physics.add.sprite(100, 300, "spaceshooter", 'playerShip1_blue.png');
        this.plane
            .setOrigin(0.5, 0.5)
            .setScale(0.5, 0.5)
            .setScaleMode(Phaser.ScaleModes.NEAREST)
            .setCollideWorldBounds(true)
            .setDrag(this.drag, this.drag);


        this.registerKeyboard();
        this.registerMouse();
    }

    update(time, delta: number): void {

        if (this.plane.followingMouse) {
            const dist = Phaser.Math.Distance.Between(this.plane.x, this.plane.y, this.plane.mouseTarget.x, this.plane.mouseTarget.y);
            if (dist > this.topSpeed * delta / 1000) {
                this.physics.moveTo(this.plane, this.plane.mouseTarget.x, this.plane.mouseTarget.y, this.topSpeed);
            } else {
                this.plane.setPosition(this.plane.mouseTarget.x, this.plane.mouseTarget.y);
            }
        }
        // Constrain velocity of player
        this.constrainVelocity(this.plane, this.topSpeed);

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

        // Enables movement of player with WASD keys
        this.input.keyboard.on('keydown_W', (event) => {
            this.plane.setAccelerationY(-this.accel);
        });
        this.input.keyboard.on('keydown_S', (event) => {
            this.plane.setAccelerationY(this.accel);
        });
        this.input.keyboard.on('keydown_A', (event) => {
            this.plane.setAccelerationX(-this.accel);
        });
        this.input.keyboard.on('keydown_D', (event) => {
            this.plane.setAccelerationX(this.accel);
        });

        // Stops player acceleration on uppress of WASD keys
        this.input.keyboard.on('keyup_W', (event) => {
            if (this.moveKeys.down.isUp)
                this.plane.setAccelerationY(0);
        });
        this.input.keyboard.on('keyup_S', (event) => {
            if (this.moveKeys.up.isUp)
                this.plane.setAccelerationY(0);
        });
        this.input.keyboard.on('keyup_A', (event) => {
            if (this.moveKeys.right.isUp)
                this.plane.setAccelerationX(0);
        });
        this.input.keyboard.on('keyup_D', (event) => {
            if (this.moveKeys.left.isUp)
                this.plane.setAccelerationX(0);
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
