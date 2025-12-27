import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Trash2, 
  Lock, 
  Clock, 
  BarChart3,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import './Transfers.css';

const API_URL = 'http://localhost:3001';

function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transfersRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/transfers`),
        axios.get(`${API_URL}/api/transfers/stats/overview`)
      ]);
      setTransfers(transfersRes.data.transfers);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load transfers. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transfer?')) return;
    
    setDeleting(id);
    try {
      await axios.delete(`${API_URL}/api/transfers/${id}`);
      setTransfers(transfers.filter(t => t.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete transfer');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="transfers-page">
        <div className="container">
          <div className="loading-state">
            <Loader2 className="animate-spin" size={48} />
            <p>Loading transfers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="transfers-page">
      <div className="container">
        <div className="page-header animate-fade-in">
          <div>
            <h1>Transfer History</h1>
            <p>Manage your encrypted file transfers</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchData}>
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="error-banner animate-fade-in">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {stats && (
          <div className="stats-grid animate-fade-in">
            <div className="stat-card card">
              <div className="stat-icon">
                <FileText size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.totalUploads}</span>
                <span className="stat-label">Total Uploads</span>
              </div>
            </div>
            
            <div className="stat-card card">
              <div className="stat-icon">
                <Download size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.totalDownloads}</span>
                <span className="stat-label">Total Downloads</span>
              </div>
            </div>
            
            <div className="stat-card card">
              <div className="stat-icon">
                <BarChart3 size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.avgCompressionRatio}</span>
                <span className="stat-label">Avg Compression</span>
              </div>
            </div>
            
            <div className="stat-card card">
              <div className="stat-icon success">
                <BarChart3 size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value success">{stats.totalSaved}</span>
                <span className="stat-label">Space Saved</span>
              </div>
            </div>
          </div>
        )}

        {transfers.length === 0 ? (
          <div className="empty-state card animate-fade-in">
            <FileText size={48} />
            <h3>No Transfers Yet</h3>
            <p>Upload your first file to see it here</p>
            <Link to="/" className="btn btn-primary">
              Upload a File
            </Link>
          </div>
        ) : (
          <div className="transfers-list animate-fade-in">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="transfer-item card">
                <div className="transfer-icon">
                  <FileText size={24} />
                </div>
                
                <div className="transfer-info">
                  <div className="transfer-name">{transfer.filename}</div>
                  <div className="transfer-meta">
                    <span>{transfer.originalSize}</span>
                    <span className="separator">→</span>
                    <span className="compressed">{transfer.compressedSize}</span>
                    <span className="savings">({transfer.compressionRatio} saved)</span>
                  </div>
                </div>

                <div className="transfer-stats">
                  <div className="stat-item">
                    <Download size={14} />
                    <span>{transfer.downloadCount} / {transfer.maxDownloads || '∞'}</span>
                  </div>
                  {transfer.hasPassword && (
                    <div className="stat-item protected">
                      <Lock size={14} />
                      <span>Protected</span>
                    </div>
                  )}
                  <div className="stat-item">
                    <Clock size={14} />
                    <span>{formatDate(transfer.createdAt)}</span>
                  </div>
                </div>

                <div className="transfer-actions">
                  <a 
                    href={`/download/${transfer.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-icon"
                    title="Open download page"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button 
                    className="btn btn-icon danger"
                    onClick={() => handleDelete(transfer.id)}
                    disabled={deleting === transfer.id}
                    title="Delete transfer"
                  >
                    {deleting === transfer.id ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Transfers;
