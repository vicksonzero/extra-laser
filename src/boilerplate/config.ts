
export type IConfig = {
    player: {
        hp: number,
        mass: number,
        drag: number,
    },
    playerPart: {
        hp: number,
        mass: number,
        drag: number,
        bounce: number,
    }
}


const c = require('json-loader!yaml-loader!../config.yml');

export const config = c as IConfig;
