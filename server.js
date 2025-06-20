// ✅ server.js
const express = require("express");
const app = express();

// 🌐 Root route - just for testing server
app.get("/", (req, res) => {
  res.send("✅ DD4K File Store Bot is Running...");
});

// 🟢 Ping route - for UptimeRobot or Koyeb health check
app.get("/ping", (req, res) => {
  res.status(200).send("🐉 DD4K Monster Bot is Alive (Ping Success)");
});

// 🚀 Start Express Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web Server Running on Port ${PORT}`);
});
