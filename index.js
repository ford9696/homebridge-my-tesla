"use strict";

var Path = require('path');
var Homebridge = require('./src/homebridge.js');


module.exports = function(homebridge) {

    Homebridge.Service = homebridge.hap.Service;
    Homebridge.Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform('homebridge-my-tesla', 'Tesla', require('./src/platform.js'));
};
