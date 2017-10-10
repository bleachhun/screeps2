const _ = require("lodash");
const minds = require('mind');

class RoomPopulationMind {
    /**
     *
     * @param {RoomManager} manager
     */
    constructor(manager) {
        this.manager = manager;
        this.room = this.manager.room;

        this.freeSpawns = this.manager.spawns.filter(spawn => !spawn.spawning);
    }

    update() {
        let spawn = this.getFreeSpawn();

        if(spawn) {
            if (this.manager.getCreepCount(minds.available.harvester) < 1) {
                this.spawnHarvester(spawn);
            }
            else if(this.manager.getCreepCount(minds.available.transfer) < 2) {
                this.spawnTransfer(spawn);
            }
            else if(this.manager.getCreepCount(minds.available.harvester) < 2) {
                this.spawnHarvester(spawn);
            }
            else if(this.manager.getCreepCount(minds.available.transfer) < 3) {
                this.spawnTransfer(spawn);
            }
            else if(this.manager.getCreepCount(minds.available.upgrader) < 3) {
                this.spawnUpgrader(spawn)
            }
            else if(this.manager.constructionSites.length > 0 && this.manager.getCreepCount(minds.available.builder) < 2) {
                this.spawnBuilder(spawn);
            }
            else if(_.sum(this.manager.droppedEnergy, 'amount') > 1300 && this.getSpawnCooldown('transfer') > 200) {
                this.spawnTransfer(spawn);
            }
            else if(this.manager.storage.getStoredEnergy() > 40000 && this.getSpawnCooldown('upgrader') > 200) {
                this.spawnUpgrader(spawn)
            }
        }
    }

    getFreeSpawn() {
        return _.first(this.freeSpawns);
    }

    /**
     * @param {RoomManager} targetRoom
     * @param options
     */
    spawn(targetRoom, options) {
        let spawn = this.getFreeSpawn();

        if(!spawn) {
            return;
        }

        options.memo.roomName = targetRoom.roomName;

        console.log('SPAWN MIND', JSON.stringify(options));

        let name = this.manager.getCreepName(options.name);

        let result = spawn.spawnCreep(options.body, name, {memory: options.memo});

        if(result != OK) {
            if(result == ERR_NOT_ENOUGH_ENERGY) {
                this.room.visual.circle(spawn.pos, {fill: "transparent", stroke: "red", strokeWidth: 0.2, radius: 0.8});
                return;
            }
            console.log('Failed to spawn', name, '::', body, '::',result);
        }
        else {
            this.freeSpawns.splice(this.freeSpawns.indexOf(spawn), 1);

            this.room.memory.lastSpawnTick[options.memo.mind] = Game.time;
            console.log('Spawned new creep', name, 'with body:', options.body);

            return name;
        }
    }

    doSpawn(spawn, body, name, memo) {
        name = this.manager.getCreepName(name);

        memo.roomName = spawn.room.name;

        let result = spawn.spawnCreep(body, name, {memory: memo});

        if(result != OK) {
            if(result == ERR_NOT_ENOUGH_ENERGY) {
                this.room.visual.circle(spawn.pos, {fill: "transparent", stroke: "red", strokeWidth: 0.2, radius: 0.8});
                return;
            }
            console.log('Failed to spawn', name, '::', body, '::',result);
        }
        else {
            this.freeSpawns.splice(this.freeSpawns.indexOf(spawn), 1);

            this.room.memory.lastSpawnTick[memo.mind] = Game.time;
            console.log('Spawned new creep', name, 'with body:', body);
        }
    }

    getSpawnCooldown(mindType) {
        return (Game.time - this.room.memory.lastSpawnTick[mindType]) || 9999;
    }

    spawnHarvester(spawn) {
        let body = [MOVE, WORK, WORK];
        if(this.room.energyCapacityAvailable > 500) {
            body = [MOVE, MOVE, WORK, WORK, WORK, WORK];
        }
        if(this.room.energyCapacityAvailable > 750) {
            body = [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK];
        }
        this.doSpawn(spawn, body, 'harvester', {'mind': 'harvester'})
    }
    spawnTransfer(spawn) {
        let body = [MOVE, MOVE, CARRY, CARRY];
        if(this.room.energyCapacityAvailable > 500) {
            body = [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY];
        }

        if(this.room.energyCapacityAvailable > 700) {
            body = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY];
        }
        this.doSpawn(spawn, body, 'transfer', {'mind': 'transfer'});
    }
    spawnUpgrader(spawn) {
        let body = [MOVE, MOVE, CARRY, CARRY, WORK];
        if(this.room.energyCapacityAvailable > 600) {
            body = [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, WORK, WORK, WORK];
        }
        if(this.room.energyCapacityAvailable > 1000) {
            body = [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK, WORK];
        }
        this.doSpawn(spawn, body, 'upgrader', {'mind': 'upgrader'})
    }
    spawnBuilder(spawn) {
        let body = [MOVE, MOVE, CARRY, CARRY, WORK];
        if(this.room.energyCapacityAvailable > 600) {
            body = [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, WORK, WORK, WORK];
        }
        if(this.room.energyCapacityAvailable > 1000) {
            body = [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK, WORK];
        }
        this.doSpawn(spawn, body, 'builder', {'mind': 'builder'})
    }
}

module.exports = {
    RoomPopulationMind
};