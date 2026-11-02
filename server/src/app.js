
const express = require("express");

const stateRoutes = require("./routes/state.routes");
const detectionRoutes = require("./routes/detection.routes");
const modeRoutes = require("./routes/mode.routes");
const lightRoutes = require("./routes/light.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

app.use("/api", stateRoutes);
app.use("/api/detection", detectionRoutes);
app.use("/api/mode", modeRoutes);
app.use("/api/light", lightRoutes);

module.exports = app;
