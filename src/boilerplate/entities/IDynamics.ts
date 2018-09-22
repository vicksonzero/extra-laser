import { Part } from "./Part";
import { Player } from "./Player";
import { IMatterContactPoints } from "../Utils";
import { Enemy } from "./Enemy";

export interface ICombatEntity {
    hp: number;
    maxHP: number;
    takeDamage: (amount: number) => void;
}

export interface ISolidHitsPlayer {
    onHitPlayerPart: (playerPart: Part, contactPoints: IMatterContactPoints) => void;
    onHitPlayer: (player: Player, contactPoints: IMatterContactPoints) => void;
}

export interface ISolidHitsEnemy {
    onHitEnemy?: (enemy: Enemy, contactPoints: IMatterContactPoints) => void;
}

export interface IAaa {
    setBowOutEvent(timeToLive: number): void;
}