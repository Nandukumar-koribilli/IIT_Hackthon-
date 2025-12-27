import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Download from './pages/Download';
import Transfers from './pages/Transfers';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/download/:id" element={<Download />} />
            <Route path="/transfers" element={<Transfers />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
