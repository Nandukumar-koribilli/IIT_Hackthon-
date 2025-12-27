import { Link, useLocation } from 'react-router-dom';
import { Shield, Upload, List, Lock } from 'lucide-react';
import './Header.css';

function Header() {
  const location = useLocation();
  
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <div className="logo-icon">
            <Shield size={28} />
          </div>
          <div className="logo-text">
            <span className="logo-title">SecureTransfer</span>
            <span className="logo-subtitle">Encrypted Protocol</span>
          </div>
        </Link>
        
        <nav className="nav">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <Upload size={18} />
            <span>Upload</span>
          </Link>
          <Link 
            to="/transfers" 
            className={`nav-link ${location.pathname === '/transfers' ? 'active' : ''}`}
          >
            <List size={18} />
            <span>Transfers</span>
          </Link>
        </nav>
        
        <div className="header-badge">
          <Lock size={14} />
          <span>AES-256</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
