import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'data.json');

// Initialize database file
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
  return { transfers: [], logs: [] };
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

let db = loadDatabase();

export function initDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    saveDatabase({ transfers: [], logs: [] });
  }
  console.log('✅ Database initialized successfully');
}

// Transfer operations
export const transferDb = {
  create: (transfer) => {
    const newTransfer = {
      ...transfer,
      created_at: new Date().toISOString(),
      download_count: 0,
      status: 'active'
    };
    db.transfers.push(newTransfer);
    saveDatabase(db);
    return newTransfer;
  },

  getById: (id) => {
    return db.transfers.find(t => t.id === id);
  },

  getAll: (limit = 50, offset = 0) => {
    return db.transfers
      .filter(t => t.status === 'active')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + limit);
  },

  updateDownloadCount: (id) => {
    const transfer = db.transfers.find(t => t.id === id);
    if (transfer) {
      transfer.download_count = (transfer.download_count || 0) + 1;
      saveDatabase(db);
    }
    return transfer;
  },

  updateStatus: (id, status) => {
    const transfer = db.transfers.find(t => t.id === id);
    if (transfer) {
      transfer.status = status;
      saveDatabase(db);
    }
    return transfer;
  },

  delete: (id) => {
    const index = db.transfers.findIndex(t => t.id === id);
    if (index !== -1) {
      db.transfers.splice(index, 1);
      saveDatabase(db);
    }
  },

  cleanupExpired: () => {
    const now = new Date();
    db.transfers.forEach(t => {
      if (t.expires_at && new Date(t.expires_at) < now && t.status === 'active') {
        t.status = 'expired';
      }
    });
    saveDatabase(db);
  }
};

// Transfer log operations
export const logDb = {
  create: (log) => {
    const newLog = {
      id: db.logs.length + 1,
      ...log,
      created_at: new Date().toISOString()
    };
    db.logs.push(newLog);
    saveDatabase(db);
    return newLog;
  },

  getByTransferId: (transferId) => {
    return db.logs
      .filter(l => l.transfer_id === transferId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
};

export default db;
