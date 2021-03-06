var _ = require('lodash');
const mover = require('move-controller');

module.exports = {
    installPrototypes() {

        if(!Room.prototype.hasOwnProperty('energyMissing')) {
            Object.defineProperty(Room.prototype, "energyMissing", {
                get: function () {
                    return this.energyCapacityAvailable - this.energyAvailable;
                }
            });
        }

        if(!Creep.prototype.hasOwnProperty('workRoom')) {
            Object.defineProperty(Creep.prototype, "workRoom", {
                get: function () {
                    let workRoom = Game.rooms[this.memory.roomName];
                    if (workRoom) {
                        return workRoom.manager;
                    }
                }
            });
        }
        if(!Creep.prototype.hasOwnProperty('mover')) {
            Object.defineProperty(Creep.prototype, "mover", {
                get: function () {
                    if (!this._mover) {
                        this._mover = new mover.CreepMoveController(this);
                    }

                    return this._mover;
                }
            });
        }

        if(!Creep.prototype.hasOwnProperty('carryMax')) {
            Object.defineProperty(Creep.prototype, "carryMax", {
                get: function () {
                    return _.sum(this.carry) == this.carryCapacity;
                }
            });
        }

        if(!Creep.prototype.hasOwnProperty('carryTotal')) {
            Object.defineProperty(Creep.prototype, "carryTotal", {
                get: function () {
                    return _.sum(this.carry);
                }
            });
        }

        if(!Creep.prototype.hasOwnProperty('enterRoom')) {
            Creep.prototype.enterRoom = function() {
                if(this.pos.x === 0) {
                    this.move(RIGHT);
                }
                if(this.pos.y === 0) {
                    this.move(BOTTOM);
                }
                if(this.pos.x === 49) {
                    this.move(LEFT);
                }
                if(this.pos.y === 49) {
                    this.move(TOP);
                }
            }
        }

        if(!StructureStorage.prototype.hasOwnProperty('get')) {
            StructureStorage.prototype.get = function(resource, defaultValue) {
                return this.store[resource] || defaultValue || 0;
            }
        }

        if(!StructureTerminal.prototype.hasOwnProperty('get')) {
            StructureTerminal.prototype.get = function(resource, defaultValue) {
                return this.store[resource] || defaultValue || 0;
            }
        }

        if(!RoomPosition.prototype.hasOwnProperty('serialize')) {
            RoomPosition.prototype.serialize = function() {
                return this.x+','+this.y+','+this.roomName;
            }
        }

        if(!RoomPosition.prototype.hasOwnProperty('isEdge')) {
            RoomPosition.prototype.isEdge = function() {
                return this.x === 49 || this.y === 49 || this.x === 0 || this.y === 0;
            }
        }

        if(!RoomPosition.unserialize) {
            RoomPosition.unserialize = function(posStr) {
                let parts = posStr.split(',');
                return new RoomPosition(parts[0], parts[1], parts[2]);
            }
        }

        if(!('RESOURCES_BASE' in global)) {
            global.RESOURCES_BASE = [
                RESOURCE_UTRIUM,
                RESOURCE_KEANIUM,
                RESOURCE_ZYNTHIUM,
                RESOURCE_LEMERGIUM,
                RESOURCE_OXYGEN,
                RESOURCE_HYDROGEN,
                RESOURCE_CATALYST,
                RESOURCE_ENERGY
            ];
        }
    }
};