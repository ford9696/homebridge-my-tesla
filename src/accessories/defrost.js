var {Service, Characteristic} = require('../homebridge.js');
var Accessory = require('../accessory.js');

module.exports = class extends Accessory {

    constructor(options) {
        var config = {
            "name": "Defrost"
        };

		super({...options, config:{...config, ...options.config}});

		this.state = false;
        this.addService(new Service.Switch(this.name));
        this.enableCharacteristic(Service.Switch, Characteristic.On, this.getState.bind(this), this.setState.bind(this));

        this.vehicle.on('vehicle_data', (vehicleData) => {    
			this.updateState(vehicleData.climate_state.defrost_mode != 0);
        });
	}

	async updateState(state) {
		if (state != undefined)
			this.state = state;

		this.getService(Service.Switch).getCharacteristic(Characteristic.On).updateValue(this.state);
	}

	getState() {
		return this.state;
	}

    async setState(state) {
		try {
			state = state ? true : false;

			if (this.state != state) {
				this.debug(`Setting ${this.name} to state "${state}".`);

				this.updateState(state);

				if (state) {
					await this.vehicle.post('command/set_preconditioning_max', {on:true});
				}
				else {
					await this.vehicle.post('command/set_preconditioning_max', {on:false});
				}	
			}
		}
		catch(error) {
			this.log(error);
		}
		finally {
			this.vehicle.getVehicleData(3000);
		}
    }	



}

