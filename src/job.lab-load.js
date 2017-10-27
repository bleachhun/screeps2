var _ = require('lodash');
const minds = require('mind');
const job_common = require('job.common');

const JOB_TYPE = 'lab-load';

const STATE = {
    PICKUP: 'pickup',
    DEPOSIT: 'deposit',
};

class LabLoadJobHandler extends job_common.JobHandlerBase {

    constructor(creep, jobData) {
        super(creep, jobData);

        this.configureFSM(STATE.PICKUP, {
            [STATE.PICKUP]: {
                onTick: this.pickupFromTerminal.bind(this)
            },
            [STATE.DEPOSIT]: {
                onTick: this.loadIntoLab.bind(this)
            }
        })
    }

    pickupFromTerminal() {
        if(_.sum(this.creep.carry) > 0) {
            this.emptyCarry();
            return;
        }

        let terminal = this.roomMgr.terminal;

        if(!this.creep.pos.isNearTo(terminal)) {
            this.creep.mover.moveTo(terminal);
        }
        else {
            let target = Game.getObjectById(this.data.labId);
            let needed = target.mineralCapacity - target.mineralAmount;
            let have = terminal.get(this.data.resource);

            this.creep.withdraw(terminal, this.data.resource,
                Math.min(needed, this.creep.carryCapacity, have));

            this.fsm.enter(STATE.DEPOSIT)
        }
    }

    emptyCarry() {
        let storage = this.roomMgr.storage;

        if(!storage.isNear(this.creep)) {
            this.creep.mover.moveTo(storage.target);
        }
        else {
            this.workRoom.storage.deposit(this.creep);
        }
    }

    loadIntoLab() {
        let target = Game.getObjectById(this.data.labId);

        if(!target) {
            this.completeJob();
            return;
        }

        if(!this.creep.pos.isNearTo(target)) {
            this.creep.mover.moveTo(target);
        }
        else {
            this.creep.transfer(target, this.data.resource);
            this.completeJob();
        }
    }

    /**
     * @param {RoomManager} manager
     * @return {Array<JobDTO>}
     */
    static generateJobs(manager) {
        if(!manager.labs) {
            return [];
        }

        let jobs = [];

        for(let input of manager.labs.getLabsToLoad()) {
            if(input.lab.mineralAmount + 500 > input.lab.mineralCapacity) {
                continue;
            }

            if(manager.terminal.get(input.resource) === 0) {
                continue;
            }

            jobs.push(new LabLoadJobDTO(input.lab.id, input.resource));
        }

        return jobs;
    }
}

class LabLoadJobDTO extends job_common.JobDTO {
    /**
     * @param structId
     * @param resource
     */
    constructor(structId, resource) {
        super('lab-load-'+resource+'-'+structId, JOB_TYPE, minds.available.transfer);

        this.labId = structId;
        this.resource = resource;
    }
}

module.exports = {
    getHandler() {return LabLoadJobHandler},
    JOB_TYPE
};