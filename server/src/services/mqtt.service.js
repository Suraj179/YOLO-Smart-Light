
const mqtt = require("mqtt");
const { mqtt: config } = require("../config");

const mqttClient = mqtt.connect(config.url, {
    username: config.username,
    password: config.password
});

mqttClient.on("connect", () => {
    console.log("MQTT connected to Mosquitto");

    mqttClient.subscribe(
        config.lightStateTopic,
        { qos: 1 },
        (error) => {
            if (error) {
                console.error(
                    "MQTT subscription failed:",
                    error.message
                );
            }
        }
    );
});

mqttClient.on("reconnect", () => {
    console.log("Reconnecting to MQTT broker...");
});

mqttClient.on("error", (error) => {
    console.error("MQTT error:", error.message);
});

mqttClient.on("message", (topic, message) => {
    console.log(
        `MQTT message received [${topic}]: ${message.toString()}`
    );
});

module.exports = mqttClient;
