"use strict";

var isFunction = require('yow/is').isFunction;
var isDate = require('yow/is').isDate;
var Request = require('yow/request');



module.exports = class API {

    constructor(options) {

        var {vin, username = process.env.TESLA_USER, password = process.env.TESLA_PASSWORD, clientID = process.env.TESLA_CLIENT_ID, clientSecret = process.env.TESLA_CLIENT_SECRET} = options;

        if (!clientID || !clientSecret || !username || !password)
            throw new Error('Need Tesla credentials.');

        if (!vin) 
            throw new Error('Need the VIN number of your Tesla.');

        this.api          = null;
        this.vehicle      = null;
        this.vin          = vin;
        this.username     = username;
        this.password     = password;
        this.clientID     = clientID;
        this.clientSecret = clientSecret;
        this.token        = undefined;
        this.requests     = {};
        this.cache        = {};
        this.lastResponse = null;

        this.log = () => {};
        this.debug = () => {};

        if (options && isFunction(options.log))
            this.log = options.log;

        if (options && isFunction(options.debug))
            this.debug = options.debug;

    }

    getVehicle() {
        return this.vehicle;
    }

    getVehicleID() {
        return this.vehicle.id_s;
    }

    login() {
        if (this.vehicle)
            return Promise.resolve(this.vehicle);

        var defaultOptions = {
            debug: false,
            timeout: 2 * 60000,
            headers: {
                "x-tesla-user-agent": "TeslaApp/3.4.4-350/fad4a582e/android/8.1.0",
                "user-agent": "Mozilla/5.0 (Linux; Android 8.1.0; Pixel XL Build/OPM4.171019.021.D1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/68.0.3440.91 Mobile Safari/537.36",
                "content-type": "application/json; charset=utf-8"
            }
        };

        var api = new Request('https://owner-api.teslamotors.com', defaultOptions);
        var token = null;

        return new Promise((resolve, reject) => {
 
            Promise.resolve().then(() => {

                var options = {
                    body: {
                        "grant_type": "password",
                        "client_id": this.clientID,
                        "client_secret": this.clientSecret,
                        "email": this.username,
                        "password": this.password      
                    }
                }

                return api.request('POST', '/oauth/token', options);

            })
            .then((response) => {
                token = response.body;

                api.defaultOptions.headers['authorization'] = 'Bearer ' + response.body.access_token;

                return api.request('GET', '/api/1/vehicles');
            })
            .then((response) => {

                var vehicles = response.body.response;

                var vehicle = vehicles.find((item) => {
                    return item.vin == this.vin;
                });

                if (vehicle == undefined) {
                    throw new Error(`Vehicle ${this.vin} could not be found.`);
                }

                this.api = api;
                this.token = token;
                this.vehicle = vehicle;
                this.lastResponse = new Date();

                resolve(this.vehicle);

            })

            .catch((error) => {
                reject(error);
            });
    
        });
    }


    request(method, path) {

        return new Promise((resolve, reject) => {
            var key = `${method} ${path}`;
            this.log(`${key}...`);

            this.api.request(method, path).then((response) => {
                // Mask out the important stuff... 
                response = response.body.response;

                this.log(`${key} completed...`);

                // Save last response time
                this.lastResponse = new Date();

                // Store result in cache
                this.cache[key] = {timestamp:new Date(), data:response};

                resolve(response);
            })
            .catch((error) => {
                reject(error);
            })

        });
    };

    queuedRequest(method, path) {

        return new Promise((resolve, reject) => {
            var key = `${method} ${path}`;

            if (this.requests[key] == undefined)
                this.requests[key] = [];

            this.requests[key].push({resolve:resolve, reject:reject});
    
            if (this.requests[key].length == 1) {
                this.request(method, path).then((response) => {
                    this.requests[key].forEach((request) => {
                        request.resolve(response);
                    });
                })
                .catch((error) => {
                    this.requests[key].forEach((request) => {
                        request.reject(error);
                    });
                })
                .then(() => {
                    this.requests[key] = [];
                });
            }
        });
    };

    cachedRequest(method, path, timeout) {

        return new Promise((resolve, reject) => {
            var key = `${method} ${path}`;
            var now = new Date();    
            var cache = this.cache[key];

            if (timeout && cache && cache.data != undefined && (now.valueOf() - cache.timestamp.valueOf() < timeout)) {
                resolve(cache.data);
            }
            else {
                this.queuedRequest(method, path).then((response) => {
                    resolve(response);
                })
                .catch((error) => {
                    reject(error);
                });
            }
        });

    };




    wakeUp(timestamp) {
        return new Promise((resolve, reject) => {
            var vehicleID = this.getVehicleID();
            var wakeupInterval = 5 * 60000;
            var now = new Date();
    
            this.log('Checking if waking up is needed...');

            if (isDate(this.lastResponse) && (now.valueOf() - this.lastResponse.valueOf() < wakeupInterval))
                resolve();
            else {
                this.log('Waking up...');
                this.request('POST', `/api/1/vehicles/${vehicleID}/wake_up`).then((response) => {

                    var pause = (ms) => {
                        return new Promise((resolve, reject) => {
                            setTimeout(resolve, ms);
                        });            
                    };
        
                    if (response.state != 'online') {
                        var now = new Date();
    
                        if (timestamp == undefined) {
                            timestamp = new Date();
    
                            this.log('State is %s, waking up...', response.state);
                        }
                        else {
                            this.log('Still not awake. State is now %s', response.state);
                        }
    
                        if (now.getTime() - timestamp.getTime() < 60000 * 2) {
    
                            pause(5000).then(() => {
                                this.log('wakeUp() failed, trying to wake up again...');
                                return this.wakeUp(timestamp);
                            })
                            .then(() => {
                                resolve();
                            })
                            .catch((error) => {
                                reject(error);
                            })
                        }
                        else {
                            reject(new Error('The Tesla cannot be reached.'));
                        }
                    }
                    else {
                        resolve();
                    }
                })
                .catch((error) => {
                    reject(error);
                })
    
            }     
        });
    }

    getVehicleData() {
        return this.queuedRequest('GET', `/api/1/vehicles/${this.getVehicleID()}/vehicle_data`, 1000);
    }

    postCommand(command) {
        return this.queuedRequest('POST', `/api/1/vehicles/${this.getVehicleID()}/command/${command}`);
    }

    doorLock() {
        return this.postCommand('door_lock');
    }

    doorUnlock() {
        return this.postCommand('door_unlock');
    }

    autoConditioningStart() {
        return this.postCommand('auto_conditioning_start');
    }

    autoConditioningStop() {
        return this.postCommand('auto_conditioning_stop');
    }

    chargePortDoorOpen() {
        return this.postCommand('charge_port_door_open');
    }

    chargePortDoorClose() {
        return this.postCommand('charge_port_door_close');
    }

    chargeStart() {
        return this.postCommand('charge_start');
    }

    chargeStop() {
        return this.postCommand('charge_stop');
    }

    remoteStartDrive() {
        return this.postCommand(`remote_start_drive?password=${this.password}`);
    }


}
