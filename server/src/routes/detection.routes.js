const db = require("../database/database");
const express = require("express");
const {
    systemState,
    setLightState,
    startAutoOffTimer,
    cancelAutoOffTimer
} = require("../services/light.service");

const router = express.Router();

router.post("/", (req, res) => {
    const { personDetected, confidence } = req.body;

    if (typeof personDetected !== "boolean") {
        return res.status(400).json({
            error: "personDetected must be a boolean"
        });
    }

    const previousPersonDetected =
        systemState.ai.personDetected;

    // Record only changes in detection status.
    // This avoids storing an event for every webcam frame.
    if (personDetected !== previousPersonDetected) {
        db.prepare(`
            INSERT INTO detection_events (
                person_detected,
                confidence,
                detected_at
            )
            VALUES (?, ?, ?)
        `).run(
            personDetected ? 1 : 0,
            typeof confidence === "number" &&
                Number.isFinite(confidence)
                ? confidence
                : 0,
            new Date().toISOString()
        );
    }


    systemState.ai.personDetected = personDetected;

    systemState.ai.confidence =
        typeof confidence === "number" &&
            Number.isFinite(confidence)
            ? confidence
            : 0;

    systemState.ai.updatedAt = new Date().toISOString();

    console.log("\nAI STATE UPDATED");
    console.log(`Person detected: ${personDetected}`);
    console.log(`Confidence: ${systemState.ai.confidence}`);

    if (systemState.mode === "AUTO") {
        if (personDetected) {
            setLightState(true);
            cancelAutoOffTimer();
        } else if (previousPersonDetected) {
            if (systemState.light.state) {
                startAutoOffTimer();
            }
        } else {
            console.log(
                "Person still absent; keeping timer unchanged."
            );
        }
    }

    res.json({
        success: true,
        state: systemState
    });
});

module.exports = router;
