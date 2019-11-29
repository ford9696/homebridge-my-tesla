
var Service  = require('../homebridge.js').Service;
var Characteristic  = require('../homebridge.js').Characteristic;
var Accessory = require('../accessory.js');


module.exports = class Switch extends Accessory {

    constructor(options) {

        super(options);
 
        this.switchState = false;
        
        this.addService(new Service.Switch(this.name));
        this.enableCharacteristic(Service.Switch, Characteristic.On, this.getSwitchState.bind(this), this.setSwitchState.bind(this));
    }

    updateSwitchState(value) {
        var service = this.getService(Service.Switch);

        var updateValue = () => {
            service.getCharacteristic(Characteristic.On).updateValue(this.getSwitchState());
            return Promise.resolve();
        };

        if (value == undefined) {
            return updateValue();
        }
        return new Promise((resolve, reject) => {
            this.setSwitchState(value).then(() => {
                return updateValue();
            })
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        });
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

