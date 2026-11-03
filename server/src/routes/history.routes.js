
const express = require("express");
const db = require("../database/database");
const authenticateToken = require("../middleware/auth.middleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const evidenceDirectory = path.join(
    __dirname,
    "../../data/evidence"
);

fs.mkdirSync(evidenceDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, evidenceDirectory);
    },

    filename: (req, file, callback) => {
        const eventId = req.params.eventId;
        const uniquePart = `${Date.now()}-${Math.round(
            Math.random() * 1_000_000
        )}`;

        callback(
            null,
            `event-${eventId}-${uniquePart}.jpg`
        );
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, callback) => {
        if (file.mimetype !== "image/jpeg") {
            return callback(
                new Error("Only JPEG images are accepted.")
            );
        }

        callback(null, true);
    }
});

// Retrieve recent detection events.

router.get("/", authenticateToken, (req, res) => {
    try {
        const showAll = req.query.all === "true";
        const status = req.query.status;

        // Validate the optional detection-status filter.
        if (
            status &&
            status !== "detected" &&
            status !== "absent"
        ) {
            return res.status(400).json({
                error: "Status must be detected or absent."
            });
        }

        // Default: return the 25 most recent events.
        const limitValue = Number.parseInt(req.query.limit, 10);
        const limit = Number.isInteger(limitValue)
            ? Math.min(Math.max(limitValue, 1), 100)
            : 25;

        let sql = `
            SELECT
                id,
                person_detected,
                confidence,
                detected_at,
                image_path
            FROM detection_events
        `;

        const parameters = [];

        if (status === "detected") {
            sql += " WHERE person_detected = ?";
            parameters.push(1);
        } else if (status === "absent") {
            sql += " WHERE person_detected = ?";
            parameters.push(0);
        }

        sql += " ORDER BY id DESC";

        // Apply the limit unless the user requests all events.
        if (!showAll) {
            sql += " LIMIT ?";
            parameters.push(limit);
        }

        const events = db.prepare(sql).all(...parameters);

        return res.json({
            success: true,
            count: events.length,
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

// Attach an uploaded image to an existing detection event.
// Intended for the local Python detection service.
router.post(
    "/:eventId/image",
    upload.single("image"),
    (req, res) => {
        try {
            const eventId = Number(req.params.eventId);

            if (
                !Number.isSafeInteger(eventId) ||
                eventId <= 0
            ) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }

                return res.status(400).json({
                    error: "Invalid event ID."
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    error: "An image file is required."
                });
            }

            const event = db.prepare(`
                SELECT id
                FROM detection_events
                WHERE id = ?
            `).get(eventId);

            if (!event) {
                fs.unlinkSync(req.file.path);

                return res.status(404).json({
                    error: "Detection event not found."
                });
            }

            const imagePath =
                `evidence/${req.file.filename}`;

            db.prepare(`
                UPDATE detection_events
                SET image_path = ?
                WHERE id = ?
            `).run(imagePath, eventId);

            return res.json({
                success: true,
                eventId,
                message: "Image evidence saved."
            });
        } catch (error) {
            console.error(
                "Image upload failed:",
                error.message
            );

            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(500).json({
                error: "Unable to save image evidence."
            });
        }
    }
);

// Retrieve image evidence for a detection event.
router.get("/:eventId/image", authenticateToken, (req, res) => {
    try {
        const eventId = Number(req.params.eventId);

        if (!Number.isSafeInteger(eventId) || eventId <= 0) {
            return res.status(400).json({
                error: "Invalid event ID."
            });
        }

        const event = db.prepare(`
            SELECT image_path
            FROM detection_events
            WHERE id = ?
        `).get(eventId);

        if (!event || !event.image_path) {
            return res.status(404).json({
                error: "Image evidence not found."
            });
        }

        // Resolve the image inside the evidence directory only.
        const evidenceDirectory = path.resolve(
            __dirname,
            "../../data/evidence"
        );

        const imagePath = path.resolve(
            evidenceDirectory,
            path.basename(event.image_path)
        );

        if (
            path.dirname(imagePath) !== evidenceDirectory ||
            !fs.existsSync(imagePath)
        ) {
            return res.status(404).json({
                error: "Image file not found."
            });
        }

        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "private, no-store");

        return res.sendFile(imagePath);

    } catch (error) {
        console.error(
            "Image retrieval failed:",
            error.message
        );

        return res.status(500).json({
            error: "Unable to retrieve image."
        });
    }
});

module.exports = router;
