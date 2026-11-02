
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");

function authenticateToken(req, res, next) {
    // Read the Authorization header.
    const authHeader = req.headers.authorization;

    // Expected format: Bearer <token>
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Authentication token is required."
        });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            error: "Authentication token is required."
        });
    }

    // Verify the signature, expiry, and permitted algorithm.
    jwt.verify(
        token,
        jwtSecret,
        { algorithms: ["HS256"] },
        (error, decoded) => {
            if (error) {
                return res.status(401).json({
                    error: "Invalid or expired authentication token."
                });
            }

            // The login endpoint sets the database user ID as JWT subject.
            const userId = Number(decoded.sub);

            if (!Number.isSafeInteger(userId) || userId <= 0) {
                return res.status(401).json({
                    error: "Invalid authentication token."
                });
            }

            // Make the authenticated user's ID available to routes.
            req.user = {
                id: userId,
                email: decoded.email
            };

            next();
        }
    );
}

module.exports = authenticateToken;
