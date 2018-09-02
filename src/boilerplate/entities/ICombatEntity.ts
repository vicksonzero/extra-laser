export interface ICombatEntity{
    hp: number;
    maxHP: number;
    takeDamage: (amount: number) => void;
}