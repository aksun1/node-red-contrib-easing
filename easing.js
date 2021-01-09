const _ = require('lodash');
const EasingFunctions = require("./easing-functions");


function stopInterval(interval) {
    if (interval != null)
        clearInterval(interval)
    interval = null;
}

module.exports = function(RED) {
    function Easing(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        // validate settings
        if (config.interval <= 0 || config.duration <= 0) {
            node.error("duration and interval need to be bigger than 0.");
            return;
        }

        if (config.numberOfValues <= 0) {
            node.error("array size must be bigger than 0.");
            return;
        }

        if (!_.has(EasingFunctions,config.easingType)) {
            node.error("easing function does not exists.");
            return;
        }

        config.interval = _.toNumber(config.interval);
        config.duration = _.toNumber(config.duration);
        config.numberOfValues = _.toNumber(config.numberOfValues);

        // holds interval
        var interval = {};

        var lastValue = 0;

        node.on('input', function(msg) {

            var startValue, endValue;

            // if payload is a number, use that as endValue 
            if (_.isNumber(msg.payload)) {
                startValue = lastValue;
                endValue = msg.payload;
            // else check if payload has to and from values
            } else if (_.isObject(msg.payload)) {
                startValue = _.has(msg.payload,'from') ? msg.payload.from : lastValue;
                endValue = _.has(msg.payload,'to') ? msg.payload.to : 1.0;
            } else {
                startValue = 0.0;
                endValue = 1.0
            }

            if (config.outputType === "asArray") {

                let size = _.has(msg.payload, 'size') ? msg.payload.size : config.numberOfValues;

                let values = _.map(_.range(0,1.0, 1.0/size), (t) => {
                    return startValue + EasingFunctions[config.easingType](t) * (endValue - startValue);
                });
                values.push(endValue);

                lastValue = endValue;

                msg.payload = values;
                node.send(msg);

            } else if (config.outputType === "overTime") {

                let duration = _.has(msg.payload, 'duration') ? msg.payload.duration : config.duration;
                let elapsed = 0;

                // clear previous interval
                stopInterval(interval[msg.topic]);

                //send start value
                msg.payload = startValue
                node.send(msg);

                // start interval
                interval[msg.topic] = setInterval( () => {
                    elapsed += config.interval;

                    let t = Math.min(1.0, elapsed / duration) 
                    let val = startValue + EasingFunctions[config.easingType](t) * (endValue - startValue);

                    lastValue = val;

                    msg.payload = val
                    node.send(msg);

                    if (t >= 1.0) {
                        stopInterval(interval[msg.topic]);
                    }
                }, config.interval)
            }
        });

        node.on('close', () => {
	    for (interva of interval){
                stopInterval(interva);
	    }
        })
    }
    RED.nodes.registerType("easing", Easing);
}
