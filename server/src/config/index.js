
require("dotenv").config();

module.exports = {
    port: Number(process.env.PORT) || 3000,

    mqtt: {
        url: process.env.MQTT_URL || "mqtt://localhost:1883",
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        lightSetTopic:
            process.env.MQTT_LIGHT_SET_TOPIC ||
            "smartlight/room1/light/set",
        lightStateTopic:
            process.env.MQTT_LIGHT_STATE_TOPIC ||
            "smartlight/room1/light/state"
    }
};
