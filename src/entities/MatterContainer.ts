export default class MatterContainer
    extends Phaser.GameObjects.Container
    implements
    Phaser.Physics.Matter.Components.Bounce,
    Phaser.Physics.Matter.Components.Collision,
    Phaser.Physics.Matter.Components.Force,
    Phaser.Physics.Matter.Components.Friction,
    Phaser.Physics.Matter.Components.Gravity,
    Phaser.Physics.Matter.Components.Mass,
    Phaser.Physics.Matter.Components.Sensor,
    Phaser.Physics.Matter.Components.SetBody,
    Phaser.Physics.Matter.Components.Sleep,
    Phaser.Physics.Matter.Components.Static,
    Phaser.Physics.Matter.Components.Transform,
    Phaser.Physics.Matter.Components.Velocity {

    setName(value: string): this {
        super.setName(value);
        return this;
    }

    setBounce(value: number): this {
        throw new Error("Method not implemented.");
    }
    setCollisionCategory(value: number): this {
        throw new Error("Method not implemented.");
    }
    setCollisionGroup(value: number): this {
        throw new Error("Method not implemented.");
    }
    setCollidesWith(categories: number | number[]): this {
        throw new Error("Method not implemented.");
    }
    applyForce(force: Phaser.Math.Vector2): this {
        throw new Error("Method not implemented.");
    }
    applyForceFrom(position: Phaser.Math.Vector2, force: Phaser.Math.Vector2): this {
        throw new Error("Method not implemented.");
    }
    thrust(speed: number): this {
        throw new Error("Method not implemented.");
    }
    thrustLeft(speed: number): this {
        throw new Error("Method not implemented.");
    }
    thrustRight(speed: number): this {
        throw new Error("Method not implemented.");
    }
    thrustBack(speed: number): this {
        throw new Error("Method not implemented.");
    }
    setFriction(value: number, air?: number, fstatic?: number): this {
        throw new Error("Method not implemented.");
    }
    setFrictionAir(value: number): this {
        throw new Error("Method not implemented.");
    }
    setFrictionStatic(value: number): this {
        throw new Error("Method not implemented.");
    }
    setIgnoreGravity(value: boolean): this {
        throw new Error("Method not implemented.");
    }
    setMass(value: number): this {
        throw new Error("Method not implemented.");
    }
    setDensity(value: number): this {
        throw new Error("Method not implemented.");
    }
    centerOfMass: Phaser.Math.Vector2;
    setSensor(value: boolean): this {
        throw new Error("Method not implemented.");
    }
    isSensor(): boolean {
        throw new Error("Method not implemented.");
    }
    setRectangle(width: number, height: number, options: object): this {
        throw new Error("Method not implemented.");
    }
    setCircle(radius: number, options: object): this {
        throw new Error("Method not implemented.");
    }
    setPolygon(radius: number, sides: number, options: object): this {
        throw new Error("Method not implemented.");
    }
    setTrapezoid(width: number, height: number, slope: number, options: object): this {
        throw new Error("Method not implemented.");
    }
    setExistingBody(body: MatterJS.Body, addToWorld?: boolean): this {
        throw new Error("Method not implemented.");
    }
    setBody(config: object, options: object): this {
        throw new Error("Method not implemented.");
    }
    setSleepThreshold(value?: number): this {
        throw new Error("Method not implemented.");
    }
    setSleepEvents(start: boolean, end: boolean): this {
        throw new Error("Method not implemented.");
    }
    setSleepStartEvent(value: boolean): this {
        throw new Error("Method not implemented.");
    }
    setSleepEndEvent(value: boolean): this {
        throw new Error("Method not implemented.");
    }
    setStatic(value: boolean): this {
        throw new Error("Method not implemented.");
    }
    isStatic(): boolean {
        throw new Error("Method not implemented.");
    }
    setFixedRotation(): this {
        throw new Error("Method not implemented.");
    }
    setAngularVelocity(value: number): this {
        throw new Error("Method not implemented.");
    }
    setVelocityX(x: number): this {
        throw new Error("Method not implemented.");
    }
    setVelocityY(y: number): this {
        throw new Error("Method not implemented.");
    }
    setVelocity(x: number, y?: number): this {
        throw new Error("Method not implemented.");
    }


}