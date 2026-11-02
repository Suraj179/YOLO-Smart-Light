
const express = require("express");
const { systemState } = require("../services/light.service");

const router = express.Router();

router.get("/", (req, res) => {
    res.json({
        message: "Smart Lighting Backend is running"
    });
});

router.get("/state", (req, res) => {
    res.json(systemState);
});

module.exports = router;
