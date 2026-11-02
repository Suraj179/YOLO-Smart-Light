
const mqttClient = require("./mqtt.service");
const { mqtt: config } = require("../config");

const systemState = {
    ai: {
        personDetected: false,
        confidence: 0,
        updatedAt: null
    },

    mode: "AUTO",

    light: {
        state: false,
        changedAt: null
    },

    timer: {
        enabled: true,
        durationSeconds: 10,
        remainingSeconds: 0,
        running: false
    }
};

let autoOffTimer = null;

function setLightState(newState) {
    // Avoid duplicate state transitions.
    if (systemState.light.state === newState) {
        return;
    }

    systemState.light.state = newState;
    systemState.light.changedAt = new Date().toISOString();

    const command = newState ? "ON" : "OFF";

    console.log("\nLIGHT STATE CHANGED:", command);

    if (mqttClient.connected) {
        mqttClient.publish(
            config.lightSetTopic,
            command,
            { qos: 1 },
            (error) => {
                if (error) {
                    console.error(
                        "MQTT publish failed:",
                        error.message
                    );
                } else {
                    console.log(
                        `MQTT command published: ${command}`
                    );
                }
            }
        );
    } else {
        console.warn(
            "MQTT disconnected; light command was not published."
        );
    }
}

function startAutoOffTimer() {
    if (autoOffTimer !== null) {
        clearTimeout(autoOffTimer);
    }

    systemState.timer.running = true;
    systemState.timer.remainingSeconds =
        systemState.timer.durationSeconds;

    console.log("\nNO PERSON DETECTED");
    console.log(
        `AUTO-OFF TIMER STARTED: ${systemState.timer.durationSeconds} seconds`
    );

    autoOffTimer = setTimeout(() => {
        if (
            systemState.mode === "AUTO" &&
            !systemState.ai.personDetected
        ) {
            setLightState(false);

            console.log("\nAUTO-OFF TIMER EXPIRED");
            console.log("No person detected for 10 seconds.");
            console.log("LIGHT: OFF");
        }

        autoOffTimer = null;
        systemState.timer.running = false;
        systemState.timer.remainingSeconds = 0;
    }, systemState.timer.durationSeconds * 1000);
}

function cancelAutoOffTimer() {
    if (autoOffTimer !== null) {
        clearTimeout(autoOffTimer);
        autoOffTimer = null;

        console.log("\nAUTO-OFF TIMER CANCELLED");
    }

    systemState.timer.running = false;
    systemState.timer.remainingSeconds = 0;
}

module.exports = {
    systemState,
    setLightState,
    startAutoOffTimer,
    cancelAutoOffTimer
};
