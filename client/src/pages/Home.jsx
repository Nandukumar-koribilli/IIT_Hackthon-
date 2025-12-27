import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Shield, 
  Zap, 
  Lock, 
  FileText,
  CheckCircle,
  Copy,
  ExternalLink,
  AlertCircle,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './Home.css';

const API_URL = 'http://localhost:3001';

function Home() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Upload options
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState('24');
  const [maxDownloads, setMaxDownloads] = useState('');
  const [compressionLevel, setCompressionLevel] = useState('6');

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setUploadResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 500 * 1024 * 1024 // 500MB
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStage('Preparing...');
    setError(null);

    // Connect to socket for real-time progress
    const socket = io(API_URL);
    
    socket.on('upload-progress', (data) => {
      setUploadProgress(data.progress);
      setUploadStage(data.stage === 'compressing' ? 'Compressing file...' :
                     data.stage === 'encrypting' ? 'Encrypting with AES-256...' :
                     data.stage === 'complete' ? 'Complete!' : 'Processing...');
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('compressionLevel', compressionLevel);
      if (password) formData.append('password', password);
      if (expiresIn) formData.append('expiresIn', expiresIn);
      if (maxDownloads) formData.append('maxDownloads', maxDownloads);

      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (percentCompleted < 30) {
            setUploadProgress(percentCompleted);
            setUploadStage('Uploading file...');
          }
        }
      });

      setUploadResult(response.data);
      setUploadProgress(100);
      setUploadStage('Complete!');
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      socket.disconnect();
    }
  };

  const copyToClipboard = async () => {
    if (uploadResult) {
      const downloadUrl = `${window.location.origin}/download/${uploadResult.transfer.id}#key=${uploadResult.decryptionKey}&tag=${uploadResult.authTag}`;
      await navigator.clipboard.writeText(downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadResult(null);
    setUploadProgress(0);
    setUploadStage('');
    setError(null);
    setPassword('');
    setExpiresIn('24');
    setMaxDownloads('');
  };

  return (
    <div className="home">
      <div className="container">
        {/* Hero Section */}
        <section className="hero animate-fade-in">
          <div className="hero-badge">
            <Shield size={14} />
            <span>End-to-End Encrypted</span>
          </div>
          <h1 className="hero-title">
            Compressed & Encrypted
            <span className="text-gradient"> Data Transfer Protocol</span>
          </h1>
          <p className="hero-description">
            A lightweight protocol to securely transfer large data files with 
            high compression and end-to-end encryption.
          </p>
          
          <div className="hero-features">
            <div className="feature-tag">
              <Lock size={14} />
              <span>Encryption</span>
            </div>
            <div className="feature-tag">
              <Zap size={14} />
              <span>Compression</span>
            </div>
            <div className="feature-tag">
              <FileText size={14} />
              <span>Node.js</span>
            </div>
            <div className="feature-tag">
              <Shield size={14} />
              <span>DB</span>
            </div>
          </div>
        </section>

        {/* Upload Section */}
        {!uploadResult ? (
          <section className="upload-section animate-fade-in">
            <div 
              {...getRootProps()} 
              className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${file ? 'dropzone-has-file' : ''}`}
            >
              <input {...getInputProps()} />
              
              {file ? (
                <div className="file-preview">
                  <div className="file-icon">
                    <FileText size={32} />
                  </div>
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatFileSize(file.size)}</span>
                  </div>
                  <button 
                    className="btn btn-secondary"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="dropzone-content">
                  <div className="dropzone-icon">
                    <Upload size={32} />
                  </div>
                  <p className="dropzone-text">
                    {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
                  </p>
                  <p className="dropzone-subtext">or click to browse (max 500MB)</p>
                </div>
              )}
            </div>

            {file && (
              <div className="upload-options">
                <h3>Transfer Options</h3>
                
                <div className="options-grid">
                  <div className="option-group">
                    <label>Password Protection (optional)</label>
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                  
                  <div className="option-group">
                    <label>Expires In</label>
                    <select 
                      value={expiresIn}
                      onChange={(e) => setExpiresIn(e.target.value)}
                    >
                      <option value="1">1 hour</option>
                      <option value="6">6 hours</option>
                      <option value="24">24 hours</option>
                      <option value="72">3 days</option>
                      <option value="168">7 days</option>
                      <option value="">Never</option>
                    </select>
                  </div>
                  
                  <div className="option-group">
                    <label>Max Downloads (optional)</label>
                    <input 
                      type="number"
                      value={maxDownloads}
                      onChange={(e) => setMaxDownloads(e.target.value)}
                      placeholder="Unlimited"
                      min="1"
                    />
                  </div>
                  
                  <div className="option-group">
                    <label>Compression Level</label>
                    <select 
                      value={compressionLevel}
                      onChange={(e) => setCompressionLevel(e.target.value)}
                    >
                      <option value="1">Fast (Level 1)</option>
                      <option value="3">Quick (Level 3)</option>
                      <option value="6">Balanced (Level 6)</option>
                      <option value="9">Maximum (Level 9)</option>
                    </select>
                  </div>
                </div>

                {uploading ? (
                  <div className="upload-progress">
                    <div className="progress-header">
                      <Loader2 className="animate-spin" size={20} />
                      <span>{uploadStage}</span>
                      <span className="progress-percent">{uploadProgress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-primary upload-btn" onClick={handleUpload}>
                    <Shield size={18} />
                    <span>Encrypt & Upload</span>
                  </button>
                )}

                {error && (
                  <div className="error-message">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="success-section animate-fade-in">
            <div className="success-card card">
              <div className="success-icon">
                <CheckCircle size={48} />
              </div>
              <h2>Transfer Complete!</h2>
              <p>Your file has been encrypted and uploaded securely.</p>
              
              <div className="transfer-stats">
                <div className="stat">
                  <span className="stat-label">Original Size</span>
                  <span className="stat-value">{uploadResult.transfer.originalSize}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Compressed Size</span>
                  <span className="stat-value">{uploadResult.transfer.compressedSize}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Space Saved</span>
                  <span className="stat-value success">{uploadResult.transfer.savings}</span>
                </div>
              </div>

              <div className="download-link-section">
                <label>Share this secure download link:</label>
                <div className="download-link-box">
                  <input 
                    type="text"
                    value={`${window.location.origin}/download/${uploadResult.transfer.id}#key=${uploadResult.decryptionKey}&tag=${uploadResult.authTag}`}
                    readOnly
                  />
                  <button className="btn btn-icon" onClick={copyToClipboard}>
                    {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                  </button>
                  <a 
                    href={`/download/${uploadResult.transfer.id}#key=${uploadResult.decryptionKey}&tag=${uploadResult.authTag}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-icon"
                  >
                    <ExternalLink size={20} />
                  </a>
                </div>
                {copied && <span className="copied-text">Copied to clipboard!</span>}
              </div>

              <div className="transfer-details">
                <div className="detail">
                  <Lock size={16} />
                  <span>Password: {uploadResult.transfer.hasPassword ? 'Protected' : 'None'}</span>
                </div>
                <div className="detail">
                  <span>Expires: {uploadResult.transfer.expiresAt ? new Date(uploadResult.transfer.expiresAt).toLocaleString() : 'Never'}</span>
                </div>
                <div className="detail">
                  <span>Max Downloads: {uploadResult.transfer.maxDownloads}</span>
                </div>
              </div>

              <button className="btn btn-secondary mt-lg" onClick={resetUpload}>
                Upload Another File
              </button>
            </div>
          </section>
        )}

        {/* Features */}
        <section className="features-section">
          <div className="features-grid">
            <div className="feature-card card card-hover">
              <div className="feature-icon">
                <Lock size={24} />
              </div>
              <h4>AES-256-GCM Encryption</h4>
              <p>Military-grade encryption ensures your files are completely secure during transfer.</p>
            </div>
            
            <div className="feature-card card card-hover">
              <div className="feature-icon">
                <Zap size={24} />
              </div>
              <h4>High Compression</h4>
              <p>Advanced Gzip/Brotli compression reduces file sizes by up to 90%.</p>
            </div>
            
            <div className="feature-card card card-hover">
              <div className="feature-icon">
                <Shield size={24} />
              </div>
              <h4>End-to-End Encryption</h4>
              <p>Encryption keys never leave your browser. Only you and the recipient can decrypt.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
