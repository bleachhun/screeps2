var _ = require('lodash');
let mind = require('mind.common');
const maps = require('maps');
let bb = require('utils.bodybuilder');

const STATE_REFILL = 'refill';
const STATE_BUILD = 'build';
const STATE_ENTER = 'enter-room';

class SettlerMind extends mind.CreepMindBase {
    constructor(creep, roomManager) {
        super(creep, roomManager);

        let fsm = {
            [STATE_REFILL]: {
                onTick: this.doRefill.bind(this),
            },
            [STATE_BUILD]: {
                onTick: this.doBuild.bind(this),
            },
            [STATE_ENTER]: {
                onTick: this.gotoRoom.bind(this),
            }
        };

        this.setStateMachine(fsm, STATE_ENTER);
    }

    gotoRoom() {
        if(this.creep.pos.roomName === this.creep.memory.roomName) {
            this.enterState(STATE_REFILL);
            return;
        }

        this.creep.mover.moveByPath(() => {
            let cache = maps.getRoomCache(this.creep.memory.roomName);
            let cacheCtrl = cache.controller;
            maps.getMultiRoomPath(this.creep.pos, cacheCtrl.pos);

            return maps.getMultiRoomPath(this.creep.pos, cacheCtrl.pos);
        });
    }

    doRefill() {
        if(!this.workRoom) {
            return;
        }

        let source = this.creep.pos.findClosestByPath(this.workRoom.room.find(FIND_SOURCES_ACTIVE));

        if(_.sum(this.creep.carry) == this.creep.carryCapacity) {
            this.enterState(STATE_BUILD);
        }

        if(this.creep.pos.isNearTo(source)) {
            this.creep.harvest(source);
        }
        else {
            this.creep.moveTo(source, {visualizePathStyle: {stroke: "green"}});
        }
    }

    doBuild() {
        let target;

        if(!this.workRoom) {
            return;
        }

        if(this.workRoom.room.controller.ticksToDowngrade < 1000) {
            target = this.workRoom.room.controller;
        }
        else {
            target = _.first(this.workRoom.room.find(FIND_MY_CONSTRUCTION_SITES));
        }

        if(!target) {
            target = this.workRoom.room.controller;
        }

        if(_.sum(this.creep.carry) === 0) {
            this.enterState(STATE_REFILL);
            return;
        }

        if(this.creep.pos.inRangeTo(target, 3)) {
            if(target.structureType == STRUCTURE_CONTROLLER) {
                this.creep.upgradeController(target);
            }
            else {
                this.creep.build(target);
            }
        }
        else {
            this.creep.moveTo(target);
        }

    }

    /**
     * @param {RoomManager} manager
     */
    static getSpawnParams(manager) {
        let body = [MOVE, MOVE, CARRY, CARRY, WORK];

        if(manager.room.energyCapacityAvailable > 1000) {
            body = bb.build([WORK, CARRY, MOVE], 700);
        }

        return {
            body: body,
            name: 'settler',
            memo: {'mind': 'settler'}
        };
    }
}

module.exports = {
    SettlerMind
};