const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../database/database");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

// Register a new user.
router.post("/register", (req, res) => {
    const { email, password } = req.body;

    // Check that both fields were provided.
    if (
        typeof email !== "string" ||
        typeof password !== "string"
    ) {
        return res.status(400).json({
            error: "Email and password are required."
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Basic email validation.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
        return res.status(400).json({
            error: "Please provide a valid email address."
        });
    }

    // Require a password between 8 and 72 UTF-8 bytes.
    if (
        password.length < 8 ||
        Buffer.byteLength(password, "utf8") > 72
    ) {
        return res.status(400).json({
            error: "Password must be at least 8 characters and no more than 72 UTF-8 bytes."
        });
    }

    try {
        // Hash the password before storing it.
        const passwordHash = bcrypt.hashSync(password, 12);

        const statement = db.prepare(`
            INSERT INTO users (email, password_hash)
            VALUES (?, ?)
        `);

        const result = statement.run(
            normalizedEmail,
            passwordHash
        );

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            user: {
                id: result.lastInsertRowid,
                email: normalizedEmail
            }
        });
    } catch (error) {
        // SQLite error code for a UNIQUE constraint violation.
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        console.error("Registration failed:", error.message);

        return res.status(500).json({
            error: "Unable to create account."
        });
    }
});


router.post("/login", (req, res) => {
    const { email, password } = req.body;

    // Validate the request fields.
    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim()
    ) {
        return res.status(400).json({
            error: "Email and password are required."
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        // Find the account by email.
        const user = db.prepare(`
            SELECT id, email, password_hash
            FROM users
            WHERE email = ?
        `).get(normalizedEmail);

        // Use the same message for unknown emails and wrong passwords.
        if (
            !user ||
            !bcrypt.compareSync(password, user.password_hash)
        ) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        // Create a signed JWT for the authenticated user.
        const token = jwt.sign(
            { email: user.email },
            jwtSecret,
            {
                subject: String(user.id),
                expiresIn: "1h",
                algorithm: "HS256"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            tokenType: "Bearer",
            expiresIn: 3600,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Login failed:", error.message);

        return res.status(500).json({
            error: "Unable to log in."
        });
    }
});


router.get("/me", authenticateToken, (req, res) => {
    try {
        const user = db.prepare(`
            SELECT id, email
            FROM users
            WHERE id = ?
        `).get(req.user.id);

        if (!user) {
            return res.status(401).json({
                error: "User account not found."
            });
        }

        return res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error("User verification failed:", error.message);

        return res.status(500).json({
            error: "Unable to verify user."
        });
    }
});

module.exports = router;
