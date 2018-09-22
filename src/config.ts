
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
