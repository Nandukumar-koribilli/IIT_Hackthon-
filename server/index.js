import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Routes
import uploadRoutes from "./routes/upload.js";
import downloadRoutes from "./routes/download.js";
import transferRoutes from "./routes/transfers.js";

// Database
import { initDatabase } from "./db/database.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory
import fs from "fs";
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize database
initDatabase();

// Make io accessible in routes
app.set("io", io);

// API Routes
app.use("/api/upload", uploadRoutes);
app.use("/api/download", downloadRoutes);
app.use("/api/transfers", transferRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Secure Transfer Protocol Server Running",
  });
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-transfer", (transferId) => {
    socket.join(`transfer-${transferId}`);
    console.log(`Socket ${socket.id} joined transfer-${transferId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║     Compressed & Encrypted Data Transfer Protocol         ║
  ║                    Server Running                         ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  🚀 API Server:    http://localhost:${PORT}                  ║
  ║  🔒 Encryption:    AES-256-GCM                            ║
  ║  📦 Compression:   Gzip/Brotli                            ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

export { io };
