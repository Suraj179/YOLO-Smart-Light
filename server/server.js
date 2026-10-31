const express = require("express");
require("dotenv").config();
const mqtt = require("mqtt");
const app = express();
const PORT = 3000;

app.use(express.json());


// Connect Node.js to the local Mosquitto broker
const mqttClient = mqtt.connect("mqtt://localhost:1883",{
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
});

mqttClient.on("connect", () => {
    console.log("MQTT connected to Mosquitto");

    mqttClient.subscribe("smartlight/room1/light/state");
});

mqttClient.on("error", (error) => {
    console.error("MQTT error:", error.message);
});

mqttClient.on("message", (topic, message) => {
    console.log(`MQTT message received [${topic}]: ${message.toString()}`);
});


// ==========================================
// SYSTEM STATE
// ==========================================

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


// ==========================================
// TIMER
// ==========================================

// Stores the currently running OFF timer.
// null means no timer is running.
let autoOffTimer = null;


// ==========================================
// ROOT API
// ==========================================

app.get("/", (req, res) => {
    res.json({
        message: "Smart Lighting Backend is running"
    });
});


// ==========================================
// GET CURRENT SYSTEM STATE
// ==========================================

app.get("/api/state", (req, res) => {
    res.json(systemState);
});


// ==========================================
// LIGHT CONTROL
// ==========================================

function setLightState(newState) {

    // Avoid duplicate state transitions and commands
    if (systemState.light.state === newState) {
        return;
    }

    systemState.light.state = newState;
    systemState.light.changedAt = new Date().toISOString();

    const command = newState ? "ON" : "OFF";

    console.log("\nLIGHT STATE CHANGED:", command);

    // Publish the command when MQTT is connected
    if (mqttClient.connected) {
        mqttClient.publish(
            "smartlight/room1/light/set",
            command,
            { qos: 1 },
            (error) => {
                if (error) {
                    console.error("MQTT publish failed:", error.message);
                } else {
                    console.log(`MQTT command published: ${command}`);
                }
            }
        );
    } else {
        console.warn("MQTT disconnected; light command was not published.");
    }
}


// ==========================================
// START 10-SECOND AUTO-OFF TIMER
// ==========================================

function startAutoOffTimer() {

    // If a timer is already running,
    // cancel it before starting a new one.
    if (autoOffTimer !== null) {
        clearTimeout(autoOffTimer);
    }

    systemState.timer.running = true;
    systemState.timer.remainingSeconds =
        systemState.timer.durationSeconds;

    console.log(
        `\nNO PERSON DETECTED`
    );

    console.log(
        `AUTO-OFF TIMER STARTED: ${systemState.timer.durationSeconds} seconds`
    );


    autoOffTimer = setTimeout(() => {

        // Before turning the light OFF,
        // check whether a person is still absent.
        if (
            systemState.mode === "AUTO" &&
            !systemState.ai.personDetected
        ) {

            setLightState(false);

            console.log(
                "\nAUTO-OFF TIMER EXPIRED"
            );

            console.log(
                "No person detected for 10 seconds."
            );

            console.log(
                "LIGHT: OFF"
            );
        }

        // Timer has finished.
        autoOffTimer = null;

        systemState.timer.running = false;
        systemState.timer.remainingSeconds = 0;

    }, systemState.timer.durationSeconds * 1000);
}


// ==========================================
// CANCEL AUTO-OFF TIMER
// ==========================================

function cancelAutoOffTimer() {

    if (autoOffTimer !== null) {

        clearTimeout(autoOffTimer);

        autoOffTimer = null;

        console.log(
            "\nAUTO-OFF TIMER CANCELLED"
        );
    }

    systemState.timer.running = false;
    systemState.timer.remainingSeconds = 0;
}


// ==========================================
// AI DETECTION API
// ==========================================


app.post("/api/detection", (req, res) => {

    const { personDetected, confidence } = req.body;

    // 1. Validate input
    if (typeof personDetected !== "boolean") {
        return res.status(400).json({
            error: "personDetected must be a boolean"
        });
    }

    // 2. Save the previous AI state BEFORE updating it
    const previousPersonDetected =
        systemState.ai.personDetected;

    // 3. Update AI state
    systemState.ai.personDetected = personDetected;

    systemState.ai.confidence =
        typeof confidence === "number" ? confidence : 0;

    systemState.ai.updatedAt = new Date().toISOString();

    console.log("\nAI STATE UPDATED");
    console.log(`Person detected: ${personDetected}`);
    console.log(`Confidence: ${systemState.ai.confidence}`);

    // 4. Make light decisions only in AUTO mode
    if (systemState.mode === "AUTO") {

        if (personDetected) {

            // Person detected: turn light ON
            setLightState(true);

            // Cancel any pending auto-off timer
            cancelAutoOffTimer();

        } else if (previousPersonDetected) {

            // Person just changed from detected to absent.
            // Start the timer only once for this transition.
            if (systemState.light.state) {
                startAutoOffTimer();
            }

        } else {

            // No person detected, and the previous state
            // was also absent. Do not restart the timer.
            console.log("Person still absent; keeping timer unchanged.");
        }
    }

    // 5. Send response
    res.json({
        success: true,
        state: systemState
    });
});


// ==========================================
// MODE API
// ==========================================

app.post("/api/mode", (req, res) => {

    const { mode } = req.body;


    // Validate mode
    if (mode !== "AUTO" && mode !== "MANUAL") {

        return res.status(400).json({
            error: "Mode must be AUTO or MANUAL"
        });
    }


    // If changing to MANUAL,
    // cancel AUTO timer.
    if (mode === "MANUAL") {

        cancelAutoOffTimer();
    }


    systemState.mode = mode;


    console.log(
        "\nSYSTEM MODE:",
        systemState.mode
    );


    // If switching to AUTO,
    // immediately apply current AI state.
    if (mode === "AUTO") {

        if (systemState.ai.personDetected) {

            setLightState(true);

            cancelAutoOffTimer();

        } else {

            startAutoOffTimer();
        }
    }


    res.json({
        success: true,
        state: systemState
    });
});


// ==========================================
// MANUAL LIGHT CONTROL API
// ==========================================

app.post("/api/light", (req, res) => {

    const { state } = req.body;


    // Validate state
    if (typeof state !== "boolean") {

        return res.status(400).json({
            error: "state must be a boolean"
        });
    }


    // Manual control only works in MANUAL mode.
    if (systemState.mode !== "MANUAL") {

        return res.status(409).json({
            error: "Manual light control requires MANUAL mode"
        });
    }


    // Cancel any AUTO timer.
    cancelAutoOffTimer();


    // Change light state.
    setLightState(state);


    console.log(
        "\nMANUAL LIGHT:",
        state ? "ON" : "OFF"
    );


    res.json({
        success: true,
        state: systemState
    });
});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

    console.log(
        `Smart Lighting Backend running at http://localhost:${PORT}`
    );

    console.log(
        "Mode: AUTO"
    );

    console.log(
        "Auto-off delay: 10 seconds"
    );
});