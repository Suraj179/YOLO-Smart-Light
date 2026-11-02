
const app = require("./app");
const { port } = require("./config");

// Load the MQTT service so the broker connection starts.
require("./services/mqtt.service");

const server = app.listen(port, () => {
    console.log(
        `Smart Lighting Backend running on port ${port}`
    );
    console.log("Mode: AUTO");
    console.log("Auto-off delay: 10 seconds");
});

function shutdown() {
    console.log("\nShutting down Smart Lighting Backend...");

    server.close(() => {
        console.log("HTTP server stopped.");
        process.exit(0);
    });

    setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
