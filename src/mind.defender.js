let mind = require('mind.common');

const STATE = {
    IDLE: 'idle',
    ATTACK: 'attack'
};

class DefenderMind extends mind.CreepMindBase {
    constructor(creep, roomManager) {
        super(creep, roomManager);

        this.setStateMachine({
            [STATE.IDLE]: {
                onTick: this.gotoRoom.bind(this)
            },
            [STATE.ATTACK]: {
                onEnter: this.pickTarget.bind(this),
                onTick: this.attackTarget.bind(this)
            }
        }, STATE.IDLE);
    }

    gotoRoom() {
        let roomName = this.creep.memory.roomName;

        if(this.roomMgr.enemies.length > 0) {
            this.enterState(STATE.ATTACK);
            return;
        }

        if(this.creep.room.name != roomName) {
            let direction = this.creep.room.findExitTo(roomName);
            let exit = this.creep.pos.findClosestByRange(direction);
            this.creep.moveTo(exit);
        }
        else {
            if(!this.creep.pos.inRangeTo(this.creep.room.controller, 5)) {
                this.creep.moveTo(this.creep.room.controller);
            }
        }
    }

    pickTarget() {
        let target = _.first(this.roomMgr.enemies);

        if(!target) {
            this.enterState(STATE.IDLE);
        }

        this.localState.targetId = target.id;
    }

    attackTarget() {
        let target = Game.getObjectById(this.localState.targetId);

        if(!target) {
            this.enterState(STATE.IDLE);
            return;
        }

        if(!this.creep.pos.isNearTo(target)) {
            this.creep.moveTo(target);
        }

        this.creep.attack(target);
        this.creep.rangedAttack(target);
    }

    /**
     * @param {RoomManager} manager
     * @param roomName
     */
    static getSpawnParams(manager, roomName) {
        let body = [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK];
        if(manager.room.energyCapacityAvailable > 1000) {
            body = [TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,RANGED_ATTACK];
        }

        return {
            body: body,
            name: 'defender',
            memo: {'mind': 'defender', roomName: roomName}
        };
    }
}

module.exports = {
    DefenderMind
};