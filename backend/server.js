const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const reportRoutes = require("./routes/reportRoutes");

const app = express();
const port = Number(process.env.PORT) || 5002;
const retryDelayMs = Number(process.env.MONGO_RETRY_MS) || 10000;
let retryTimer = null;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.use("/api", reportRoutes);

mongoose.set("bufferCommands", false);

const scheduleReconnect = () => {
  if (!process.env.MONGO_URI || retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectDatabase();
  }, retryDelayMs);
};

const connectDatabase = async () => {
  if (!process.env.MONGO_URI || [1, 2].includes(mongoose.connection.readyState)) return;

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected; background sync is available");
  } catch (error) {
    console.warn(`MongoDB unavailable; continuing in local-first mode: ${error.message}`);
    scheduleReconnect();
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected; reports will remain local until it returns");
  scheduleReconnect();
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  if (process.env.MONGO_URI) {
    connectDatabase();
  } else {
    console.warn("MONGO_URI is not configured; running in local-first mode");
  }
});

module.exports = app;
