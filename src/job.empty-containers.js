var _ = require('lodash');
const minds = require('mind');
const job_common = require('job.common');
const maps = require('maps');

const profiler = require('profiler');

const JOB_TYPE = 'empty-container';

const STATE = {
    PICKUP: 'pickup',
    DEPOSIT: 'deposit',
};

class EmptyContainerJobHandler extends job_common.JobHandlerBase {

    constructor(creep, jobData) {
        super(creep, jobData);

        this.configureFSM(STATE.PICKUP, {
            [STATE.PICKUP]: {
                onTick: this.pickupFromContainer.bind(this)
            },
            [STATE.DEPOSIT]: {
                onTick: this.depositEnergy.bind(this)
            }
        })
    }

    pickupFromContainer() {
        let container = Game.getObjectById(this.data.targetId);

        if(!container) {
            this.completeJob();
            return;
        }

        if(!this.creep.pos.isNearTo(container)) {
            this.creep.mover.moveByPath(() =>{
                return maps.getMultiRoomPath(this.creep.pos, container.pos, {
                    ignoreAllLairs: this.creep.workRoom.isSKRoom,
                });
            })
        }
        else {
            this.creep.withdraw(container, _.findKey(container.store));
            this.unclaim();
            this.fsm.enter(STATE.DEPOSIT);
        }
    }

    depositEnergy() {
        let storage;

        if(this.roomMgr.isRemote) {
            storage = this.roomMgr.parent.storage;
        }
        else {
            storage = this.roomMgr.storage;
        }

        this.actions.unloadAllResources({
            storage: storage,
            onTick: () => this.repairRoad(),
            onDone: () => this.completeJob(),
            pathOptions: {
                ignoreAllLairs: this.creep.workRoom.isSKRoom,
            }
        });
    }

    repairRoad() {
        let struct = _.first(this.creep.pos.lookFor(LOOK_STRUCTURES));
        if(struct && struct.hits < struct.hitsMax) {
            this.creep.repair(struct);
        }
    }

    /**
     * @param {RoomManager} manager
     * @return {Array<JobDTO>}
     */
    static generateJobs(manager) {
        return manager.data.containers.map(/**StructureContainer*/cnt=> {
            return new EmptyContainerJobDTO(cnt);
        });
    }
}

class EmptyContainerJobDTO extends job_common.JobDTO {
    /**
     * @param {StructureContainer} container
     */
    constructor(container) {
        super('container-'+container.id, JOB_TYPE, minds.available.transfer, _.sum(container.store));

        this.targetId = container.id;
    }

    merge(data) {
        data.targetId = this.targetId;
        data.available = this.available;
    }
}

module.exports = {
    getHandler() {return EmptyContainerJobHandler},
    JOB_TYPE
};