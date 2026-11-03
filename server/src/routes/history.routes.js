
const express = require("express");
const db = require("../database/database");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

// Retrieve recent detection events.
router.get("/", authenticateToken, (req, res) => {
    try {
        const limitValue = Number.parseInt(req.query.limit, 10);
        const limit = Number.isInteger(limitValue)
            ? Math.min(Math.max(limitValue, 1), 100)
            : 50;

        const events = db.prepare(`
            SELECT
                id,
                person_detected,
                confidence,
                detected_at,
                image_path
            FROM detection_events
            ORDER BY id DESC
            LIMIT ?
        `).all(limit);

        return res.json({
            success: true,
            events: events.map((event) => ({
                ...event,
                person_detected: Boolean(event.person_detected),
            })),
        });
    } catch (error) {
        console.error("History retrieval failed:", error.message);

        return res.status(500).json({
            error: "Unable to retrieve detection history."
        });
    }
});

module.exports = router;
