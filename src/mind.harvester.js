let mind = require('mind.common');

class HarvesterMind extends mind.CreepMindBase {
    constructor(creep, roomManager) {
        super(creep, roomManager);
    }

    update() {
        switch(this.state) {
            case 'seek':
                this.doSeekTarget();
                break;
            case 'harvest':
                this.doHarvest();
                break;
            default:
                this.enterState('seek');
        }
    }

    getHarvestTarget() {
        return this.globalState['harvestId'];
    }

    doSeekTarget() {
        let target = this.getLocalTarget('targetId', () => {
            return this.roomMgr.getFreeEnergySource();
        });

        if(target.pos.isNearTo(this.creep)) {
            this.globalState['harvestId'] = target.id;
            this.enterState('harvest');
        }
        else {
            this.creep.moveTo(target);
        }
    }

    doHarvest() {
        let result = this.creep.harvest(Game.getObjectById(this.globalState['harvestId']));

        if(result != OK && result != ERR_NOT_ENOUGH_RESOURCES) {
            console.log('HARVEST FAIL', result);
        }
    }
}

module.exports = {
    HarvesterMind
};