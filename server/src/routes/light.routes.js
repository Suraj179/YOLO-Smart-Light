
const express = require("express");
const {
    systemState,
    setLightState,
    cancelAutoOffTimer
} = require("../services/light.service");

const router = express.Router();

router.post("/", (req, res) => {
    const { state } = req.body;

    if (typeof state !== "boolean") {
        return res.status(400).json({
            error: "state must be a boolean"
        });
    }

    if (systemState.mode !== "MANUAL") {
        return res.status(409).json({
            error: "Manual light control requires MANUAL mode"
        });
    }

    cancelAutoOffTimer();
    setLightState(state);

    console.log("\nMANUAL LIGHT:", state ? "ON" : "OFF");

    res.json({
        success: true,
        state: systemState
    });
});

module.exports = router;
