import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { 
  Download as DownloadIcon, 
  Lock, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
  Clock,
  DownloadCloud
} from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './Download.css';

const API_URL = 'http://localhost:3001';

function Download() {
  const { id } = useParams();
  const location = useLocation();
  
  const [transferInfo, setTransferInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');
  const [downloadComplete, setDownloadComplete] = useState(false);

  // Extract key and authTag from URL fragment
  const getDecryptionParams = () => {
    const hash = location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return {
      key: params.get('key'),
      tag: params.get('tag')
    };
  };

  useEffect(() => {
    fetchTransferInfo();
  }, [id]);

  const fetchTransferInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/download/${id}/info`);
      setTransferInfo(response.data);
    } catch (err) {
      console.error('Error fetching transfer info:', err);
      if (err.response?.status === 404) {
        setError('Transfer not found. It may have been deleted or the link is invalid.');
      } else if (err.response?.status === 410) {
        setError(err.response.data.error || 'This transfer has expired or reached its download limit.');
      } else {
        setError('Failed to load transfer information.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const { key, tag } = getDecryptionParams();
    
    if (!key || !tag) {
      setError('Invalid download link. Missing decryption key.');
      return;
    }

    if (transferInfo.hasPassword && !password) {
      setError('Please enter the password to download this file.');
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStage('Preparing download...');
    setError(null);

    // Connect to socket for progress
    const socket = io(API_URL);
    
    socket.on('download-progress', (data) => {
      if (data.transferId === id) {
        setDownloadProgress(data.progress);
        setDownloadStage(
          data.stage === 'reading' ? 'Reading file...' :
          data.stage === 'decrypting' ? 'Decrypting file...' :
          data.stage === 'decompressing' ? 'Decompressing...' :
          data.stage === 'complete' ? 'Complete!' : 'Processing...'
        );
      }
    });

    try {
      const response = await axios.post(
        `${API_URL}/api/download/${id}`,
        {
          password: password || undefined,
          decryptionKey: key,
          authTag: tag
        },
        {
          responseType: 'blob',
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              if (percent > downloadProgress) {
                setDownloadProgress(Math.min(percent, 100));
              }
            }
          }
        }
      );

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = transferInfo.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadComplete(true);
      setDownloadProgress(100);
      setDownloadStage('Download complete!');

    } catch (err) {
      console.error('Download error:', err);
      if (err.response?.status === 401) {
        setError('Invalid password. Please try again.');
      } else if (err.response?.status === 400) {
        setError('Invalid decryption key. The download link may be corrupted.');
      } else {
        setError(err.response?.data?.error || 'Download failed. Please try again.');
      }
    } finally {
      setDownloading(false);
      socket.disconnect();
    }
  };

  if (loading) {
    return (
      <div className="download-page">
        <div className="container">
          <div className="loading-state">
            <Loader2 className="animate-spin" size={48} />
            <p>Loading transfer information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !transferInfo) {
    return (
      <div className="download-page">
        <div className="container">
          <div className="error-state card">
            <AlertCircle size={48} />
            <h2>Transfer Unavailable</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="download-page">
      <div className="container">
        <div className="download-card card animate-fade-in">
          {downloadComplete ? (
            <div className="download-success">
              <div className="success-icon">
                <CheckCircle size={48} />
              </div>
              <h2>Download Complete!</h2>
              <p>Your file has been decrypted and downloaded successfully.</p>
            </div>
          ) : (
            <>
              <div className="download-header">
                <div className="file-icon-large">
                  <FileText size={40} />
                </div>
                <div className="file-details">
                  <h2 className="file-name">{transferInfo.filename}</h2>
                  <div className="file-meta">
                    <span className="meta-item">
                      <DownloadCloud size={14} />
                      {transferInfo.originalSize}
                    </span>
                    <span className="meta-item">
                      <Clock size={14} />
                      {new Date(transferInfo.createdAt).toLocaleDateString()}
                    </span>
                    {transferInfo.hasPassword && (
                      <span className="meta-item protected">
                        <Lock size={14} />
                        Password Protected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="download-info">
                <div className="info-row">
                  <span className="info-label">Original Size</span>
                  <span className="info-value">{transferInfo.originalSize}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Compressed Size</span>
                  <span className="info-value">{transferInfo.compressedSize}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Compression</span>
                  <span className="info-value success">{transferInfo.compressionRatio} saved</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Downloads</span>
                  <span className="info-value">
                    {transferInfo.downloadCount} / {transferInfo.maxDownloads || '∞'}
                  </span>
                </div>
                {transferInfo.expiresAt && (
                  <div className="info-row">
                    <span className="info-label">Expires</span>
                    <span className="info-value">
                      {new Date(transferInfo.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="security-badge">
                <Shield size={16} />
                <span>End-to-End Encrypted with AES-256-GCM</span>
              </div>

              {transferInfo.hasPassword && (
                <div className="password-section">
                  <label>Enter Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter the password to decrypt"
                  />
                </div>
              )}

              {error && (
                <div className="error-message">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {downloading ? (
                <div className="download-progress">
                  <div className="progress-header">
                    <Loader2 className="animate-spin" size={20} />
                    <span>{downloadStage}</span>
                    <span className="progress-percent">{downloadProgress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button 
                  className="btn btn-primary download-btn" 
                  onClick={handleDownload}
                >
                  <DownloadIcon size={20} />
                  <span>Decrypt & Download</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Download;
