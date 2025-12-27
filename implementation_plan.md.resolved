# Compressed & Encrypted Data Transfer Protocol

Design a lightweight protocol to securely transfer large data files with high compression and end-to-end encryption.

![Project Title](C:/Users/nandu/.gemini/antigravity/brain/47e0ec48-3b4b-4e16-a9be-d6ef982576c7/uploaded_image_1766790074485.png)

## Project Overview

A full-stack secure file transfer application that allows users to:
- **Upload large files** with automatic compression and encryption
- **Share files securely** via unique download links
- **Download files** with automatic decryption and decompression
- **Track transfers** with a comprehensive dashboard

### Core Features

| Feature | Description |
|---------|-------------|
| **End-to-End Encryption** | AES-256-GCM encryption, keys never leave the client |
| **High Compression** | Gzip/Brotli compression with streaming support |
| **Large File Support** | Chunked uploads with resume capability |
| **Transfer Tracking** | SQLite database for transfer history |
| **Secure Sharing** | Password protection and expiration dates |
| **Modern UI** | Drag-and-drop interface with progress tracking |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express.js |
| Real-time | WebSocket (Socket.io) |
| Database | SQLite with better-sqlite3 |
| Encryption | Node.js crypto (AES-256-GCM) |
| Compression | zlib, brotli |
| Frontend | HTML5, CSS3, JavaScript |
| File Handling | Multer, Streams |

---

## Proposed Changes

### Server Core

#### [NEW] [server/package.json](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/server/package.json)
Node.js dependencies:
- `express` - Web framework
- `socket.io` - Real-time progress updates
- `better-sqlite3` - SQLite database
- `multer` - File upload handling
- `uuid` - Unique transfer IDs
- `cors` - Cross-origin support

#### [NEW] [server/index.js](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/server/index.js)
Main server entry point:
- Express server setup on port 3000
- Socket.io integration for real-time updates
- Static file serving for frontend
- API route mounting
- Error handling middleware

---

### Encryption Module

#### [NEW] [server/lib/encryption.js](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/server/lib/encryption.js)
End-to-end encryption utilities:
- `generateKeyPair()` - Generate ECDH key pairs for key exchange
- `deriveSharedKey()` - Derive shared secret from key exchange
- `encrypt(data, key)` - AES-256-GCM encryption with IV
- `decrypt(data, key, iv)` - AES-256-GCM decryption
- `generateFileKey()` - Generate random file encryption key
- `hashKey(key)` - SHA-256 key hashing for verification

```javascript
// Encryption flow:
// 1. Client generates random file key
// 2. File encrypted client-side before upload
// 3. Encrypted file stored on server
// 4. Download link includes key fragment
// 5. Client decrypts after download
```

---

### Compression Module

#### [NEW] [server/lib/compression.js](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/server/lib/compression.js)
High-performance compression:
- `compressFile(inputPath, outputPath)` - Compress file using gzip
- `decompressFile(inputPath, outputPath)` - Decompress file
- `compressStream()` - Create compression transform stream
- `decompressStream()` - Create decompression transform stream
- `getCompressionRatio(original, compressed)` - Calculate savings

Compression levels:
- Level 1-3: Fast compression (for quick transfers)
- Level 4-6: Balanced (default)
- Level 7-9: Maximum compression (for storage)

---

### Database Schema

#### [NEW] [server/db/database.js](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/server/db/database.js)

```sql
-- Transfers table
CREATE TABLE transfers (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_size INTEGER NOT NULL,
    compressed_size INTEGER NOT NULL,
    encryption_iv TEXT NOT NULL,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER,
    status TEXT DEFAULT 'active'
);

-- Transfer logs
CREATE TABLE transfer_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id TEXT NOT NULL,
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_id) REFERENCES transfers(id)
);
```

---

### API Routes

#### [NEW] [server/routes/upload.js](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/server/routes/upload.js)
File upload handling:
- `POST /api/upload` - Upload file with compression
  - Accept multipart form data
  - Compress file with selected level
  - Store encrypted file
  - Return transfer ID and download link

- `POST /api/upload/chunk` - Chunked upload for large files
  - Support resume from last chunk
  - Merge chunks on completion

#### [NEW] [server/routes/download.js](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/server/routes/download.js)
File download handling:
- `GET /api/download/:id` - Download file
  - Verify password if set
  - Check expiration and download limits
  - Stream decompressed file
  - Update download count

- `GET /api/download/:id/info` - Get transfer metadata
  - File name, size, expiration
  - No password required

#### [NEW] [server/routes/transfers.js](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/server/routes/transfers.js)
Transfer management:
- `GET /api/transfers` - List user's transfers
- `DELETE /api/transfers/:id` - Delete transfer
- `PUT /api/transfers/:id` - Update settings (password, expiration)

---

### Frontend Interface

#### [NEW] [public/index.html](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/public/index.html)
Main application page:
- Hero section with product description
- Drag-and-drop upload zone
- Encryption options (password, expiration)
- Transfer progress with real-time updates
- Recent transfers list

#### [NEW] [public/download.html](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/public/download.html)
Download page:
- File information display
- Password input if protected
- Download button with progress
- Decryption status indicator

#### [NEW] [public/css/style.css](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/public/css/style.css)
Modern UI styling:
- Dark theme with blue accents (matching project branding)
- Glassmorphism cards
- Gradient backgrounds
- Smooth animations
- Responsive design
- Progress bar animations
- Drag-and-drop hover effects

#### [NEW] [public/js/app.js](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/public/js/app.js)
Main application logic:
- Drag-and-drop file handling
- File validation (size, type)
- Upload with progress tracking
- WebSocket connection for real-time updates
- Share link generation
- Copy to clipboard

#### [NEW] [public/js/crypto.js](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/public/js/crypto.js)
Client-side encryption (Web Crypto API):
- `generateKey()` - Generate AES-256 key
- `encryptFile(file, key)` - Encrypt file before upload
- `decryptFile(data, key)` - Decrypt file after download
- Key stored in URL fragment (never sent to server)

#### [NEW] [public/js/download.js](file:///c:/Users/nandu/OneDrive/Desktop/iit%20hackthon/hack%20mail/public/js/download.js)
Download page logic:
- Extract key from URL fragment
- Verify password if required
- Download encrypted file
- Decrypt and save

---

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Client Browser"]
        UI[Web Interface]
        CE[Client Encryption]
        CC[Client Compression]
    end
    
    subgraph Server["Node.js Server"]
        API[Express API]
        WS[WebSocket]
        SC[Server Compression]
        SE[Server Encryption]
    end
    
    subgraph Storage["Storage Layer"]
        DB[(SQLite DB)]
        FS[File System]
    end
    
    UI --> CE
    CE --> CC
    CC --> API
    API --> SC
    SC --> FS
    API --> DB
    WS --> UI
    
    style Client fill:#1a1a2e
    style Server fill:#16213e
    style Storage fill:#0f3460
```

---

## Security Features

> [!IMPORTANT]
> **End-to-End Encryption**: Files are encrypted client-side before upload. The encryption key is stored in the URL fragment and never sent to the server.

### Encryption Flow

1. **Upload**: Client generates random AES-256 key → Encrypts file → Uploads encrypted data
2. **Share**: Download link contains key in URL fragment (`#key=...`)
3. **Download**: Client extracts key from URL → Downloads encrypted file → Decrypts locally

### Additional Security
- Password protection with bcrypt hashing
- Transfer expiration dates
- Download count limits
- Rate limiting on API endpoints
- File size limits
- Secure file storage with random names

---

## Verification Plan

### Automated Tests
```bash
# 1. Install dependencies
cd server && npm install

# 2. Start the server
npm start

# 3. Test endpoints
# Upload: POST http://localhost:3000/api/upload
# Download: GET http://localhost:3000/api/download/:id
```

### Manual Verification
1. Upload a large file (>100MB) and verify compression
2. Download file and verify integrity (checksum)
3. Test password protection
4. Test expiration functionality
5. Verify responsive design on mobile
6. Test chunked upload with network interruption

### Browser Testing
- Test drag-and-drop in Chrome, Firefox, Edge
- Verify encryption/decryption works correctly
- Check progress indicators update in real-time
- Validate file downloads properly

---

## Deployment

The application will be ready to deploy with:
- `npm start` - Single command to start server
- SQLite database (no external DB required)
- All files served from Node.js
- Environment variables for configuration
- Production-ready error handling
