
const express = require("express");

const {
    systemState,
    setLightState,
    startAutoOffTimer,
    cancelAutoOffTimer
} = require("../services/light.service");

const router = express.Router();

router.post("/", (req, res) => {
    const { mode } = req.body;

    // Validate requested mode.
    if (mode !== "AUTO" && mode !== "MANUAL") {
        return res.status(400).json({
            error: "Mode must be AUTO or MANUAL"
        });
    }

    // Handle MANUAL mode.
    if (mode === "MANUAL") {
        cancelAutoOffTimer();
    }

    systemState.mode = mode;

    console.log("\nSYSTEM MODE:", systemState.mode);

    // Handle AUTO mode.
    if (mode === "AUTO") {
        if (systemState.ai.personDetected) {
            setLightState(true);
            cancelAutoOffTimer();
        } else if (
            systemState.light.state &&
            !systemState.timer.running
        ) {
            startAutoOffTimer();
        } else if (!systemState.light.state) {
            cancelAutoOffTimer();
        }
    }

    res.json({
        success: true,
        state: systemState
    });
});

module.exports = router;
