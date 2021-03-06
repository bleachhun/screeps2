var _ = require('lodash');
const utils = require('utils');
const flags = require('utils.flags');
const maps = require('maps');

const profiler = require('profiler');

class RoomArchitect extends utils.Executable {
    /**
     *
     * @param {RoomManager} manager
     */
    constructor(manager) {
        super();

        this.manager = manager;
        this.id = this.manager.room.controller.id;
    }

    update() {
        let availableExtensions = this.getMaxStructuresCount(STRUCTURE_EXTENSION);
        let availableTowers = this.getMaxStructuresCount(STRUCTURE_TOWER);
        let availableStorages = this.getMaxStructuresCount(STRUCTURE_STORAGE);
        let availableSpawns = this.getMaxStructuresCount(STRUCTURE_SPAWN);
        let availableExtractors = this.getMaxStructuresCount(STRUCTURE_EXTRACTOR);
        let availableLabs = this.getMaxStructuresCount(STRUCTURE_LAB);

        if(this.manager.data.extensions.length < availableExtensions) {
            utils.every(15, () => this.buildExtensions(this.manager.room));
        }

        if(this.manager.data.spawns.length < availableSpawns) {
            utils.every(15, () => this.buildSpawns(this.manager.room));
        }

        if(this.manager.towers.length < availableTowers) {
            utils.every(15, () => this.buildTowers(this.manager.room));
        }

        if(this.manager.data.labs.length < availableLabs) {
            utils.every(50, () => this.buildLabs(this.manager.room));
        }

        if(availableStorages > 0 && !this.manager.room.storage) {
            utils.every(25, () => this.buildStorage(this.manager.room));
        }

        if(availableExtractors > 0 && !this.manager.data.extractor) {
            utils.every(25, () => this.buildExtractor(this.manager.mineral, this.manager.room));
        }

        if(this.manager.room.controller.level > 2) {
            utils.everyMod(1000, this.id, () => this.planRoads());
        }
    }

    getMaxStructuresCount(type) {
        return CONTROLLER_STRUCTURES[type][this.manager.room.controller.level]
    }

    buildExtensions(room) {
        let clusters = this.manager.extensionsClusters.filter(
            c => c.extensions.length < c.extensionsMax
        );

        for(let cluster of clusters) {
            let storagePath = cluster.center.findPathTo(this.manager.storage.target);

            let pointInPath = _.first(storagePath.filter(
                pos => cluster.center.getRangeTo(pos.x, pos.y) === 1
            ));

            if(!pointInPath) {
                this.err('NO POINT IN PATH', pointInPath, '::', this.manager.storage, '::', this.manager.storage.target);
                continue;
            }

            for(let point of utils.getPositionsAround(cluster.center)) {
                if(point.isEqualTo(pointInPath.x, pointInPath.y)) {
                    continue;
                }

                room.visual.circle(point, {
                    fill: "orange",
                    opacity: 0.6
                });

                room.createConstructionSite(point.x, point.y, STRUCTURE_EXTENSION)
            }
        }
    }

    /**
     * @param {Room} room
     */
    buildSpawns(room) {
        for(let flag of this.manager.flags.filter(flags.isSpawn)) {
            if(OK === room.createConstructionSite(flag.pos, STRUCTURE_SPAWN)) {
                flag.remove();
            }
        }
    }

    /**
     * @param {Room} room
     */
    buildTowers(room) {
        for(let flag of this.manager.flags.filter(flags.isTower)) {
            if(OK === room.createConstructionSite(flag.pos, STRUCTURE_TOWER)) {
                flag.remove();
            }
        }
    }

    buildLabs(room) {
        for(let flag of this.manager.flags.filter(flags.isLab)) {
            if(OK === room.createConstructionSite(flag.pos, STRUCTURE_LAB)) {
                flag.remove();
            }
        }
    }

    buildStorage(room) {
        let pos = this.manager.storage.target.pos;
        let around = utils.getPositionsAround(pos);

        for(let p of around) {
            room.createConstructionSite(p, STRUCTURE_STORAGE);
        }
    }

    /**
     *
     * @param {MineralWrapper} mineral
     * @param room
     */
    buildExtractor(mineral, room) {
        if(!mineral.container) {
            let containerPos = mineral.pickContainerPlace();

            room.visual.circle(containerPos, {});

            room.createConstructionSite(containerPos, STRUCTURE_CONTAINER);
        }
        else {
            room.createConstructionSite(mineral.pos, STRUCTURE_EXTRACTOR);
        }
    }

    planRoads() {
        let roads = [];

        let storagePos = this.manager.storage.target.pos;

        for(let source of this.manager.data.sources) {
            this.generateRoad(source.pos, storagePos);
        }

        for(let spawn of this.manager.data.spawns) {
            this.generateRoad(spawn.pos, storagePos);
        }

        for(let cluster of this.manager.extensionsClusters) {
            this.generateRoad(cluster.center, storagePos);
        }

        if(this.manager.room.controller.level > 5) {
            this.generateRoad(this.manager.mineral.pos, storagePos);
            if(this.manager.mineral.container) {
                this.generateRoad(this.manager.mineral.container.pos, storagePos);
            }
        }

        this.generateRoad(this.manager.room.controller.pos, storagePos);

        for(let handler of this.manager.remote.handlers) {
            if(!handler.data) {
                continue;
            }

            for(let source of handler.data.sources) {
                this.generateRoad(source.pos, storagePos);
            }
        }
    }

    /**
     * @param {RoomPosition} from
     * @param {RoomPosition} to
     */
    generateRoad(from, to) {

        let path = PathFinder.search(from, {pos: to, range: 1}, {
            plainCost: 2,
            swampCost: 5,
            roomCallback: (roomName) => {
                let room = Game.rooms[roomName];

                let costs = new PathFinder.CostMatrix;

                costs = maps.blockHostileRooms(roomName, costs);

                if(!costs) {
                    return false;
                }

                maps.getCostMatrix(roomName, costs);

                if(room) {
                    room.find(FIND_CONSTRUCTION_SITES).forEach(/**ConstructionSite*/site => {
                        if(site.structureType == STRUCTURE_ROAD) {
                            costs.set(site.pos.x, site.pos.y, 1);
                        }
                    });
                    let mgr = room.manager;
                    let allStructs = [].concat(mgr.data.spawns, mgr.data.extensions, mgr.data.links, mgr.data.towers);
                    if(mgr) {
                        for(let struct of allStructs) {
                            costs.set(struct.pos.x, struct.pos.y, 0xFF);
                        }
                    }
                }


                return costs;
            }
        });

        let placedStructures = 0;

        for(let step of path.path) {
            if(from.isEqualTo(step) || to.isEqualTo(step)) {
                continue;
            }

            let room = Game.rooms[step.roomName];

            if(!room) {
                this.err('Cannot place road in room', step.roomName);
                continue;
            }

            let visual = new RoomVisual(step.roomName);
            visual.circle(step, {
                fill: "red",
                opacity: 0.3
            });

            if(room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD) === OK) {
                placedStructures ++;
            }
        }

        return placedStructures;
    }

    toString() {
        return `[RoomArchitect for ${this.manager.room}]`;
    }
}

profiler.registerClass(RoomArchitect, RoomArchitect.name);

module.exports = {
    RoomArchitect
};