
var Service  = require('../homebridge.js').Service;
var Characteristic  = require('../homebridge.js').Characteristic;
var Accessory = require('../accessory.js');

module.exports = class Switch extends Accessory {

    constructor(options) {

        super(options);
        
        this.switchState = false;

        this.addService(new Service.Switch(this.name));

        this.getService(Service.Switch).getCharacteristic(Characteristic.On).on('set', (value, callback) => {
            this.setSwitchState(value).then(() => {
            })
            .catch((error) => {
                this.log(error);
            })
            .then(() => {
                callback();
            })
        });

        this.getService(Service.Switch).getCharacteristic(Characteristic.On).on('get', (callback) => {
            callback(null, this.getSwitchState());
        });
    }

    updateSwitchState() {
        this.getService(Service.Switch).getCharacteristic(Characteristic.On).updateValue(this.getSwitchState());
        return Promise.resolve();
    }

    getSwitchState() {
        return this.switchState;
    }

    setSwitchState(value) {
        value = value ? true : false;

        return new Promise((resolve, reject) => {
            Promise.resolve().then(() => {
                if (this.switchState == value)
                    return Promise.resolve();

                this.switchState = value;
                this.debug(`Setting switch "${this.name}" state to "${this.switchState}".`);
                return this.switchState ? this.turnOn() : this.turnOff();
            })
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        });
    }

    turnOn() {
        return Promise.resolve();
    }

    turnOff() {
        return Promise.resolve();
    }

}
