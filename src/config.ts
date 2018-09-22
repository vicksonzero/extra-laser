export type ISpriteSpec = {
    key: string, frame: string
}
export type IConfig = {
    player: {
        hp: number,
        mass: number,
        drag: number,
        topSpeed: number,
        accel: number,
    },
    playerPart: {
        hp: number,
        mass: number,
        drag: number,
        bounce: number,
        gunOffsetX: number,
        gunOffsetY: number,
        gunOffsetNoise: number,
        partWingCandidates: ISpriteSpec[],
        partGunCandidates: ISpriteSpec[],
    },
    enemy: {
        hp: number,
        mass: number,
        drag: number,
        shootRate: number,
        bulletSpeed: number,
        bowOutTime: number,
    },
}


const c = require('json-loader!yaml-loader!./config.yml');

export const config = c.config as IConfig;
