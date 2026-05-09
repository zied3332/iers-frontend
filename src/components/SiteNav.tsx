import { Link } from 'react-router-dom';
import { useThemeLogo } from '../hooks/useThemeLogo';
import './SiteNav.css';

export default function SiteNav() {
  const logoSrc = useThemeLogo();

  return (
    <header className="site-topbar">
      <div className="site-container site-nav-container">
        <Link to="/" className="site-brand" aria-label="IntelliHR home">
          <img
            className="site-brand-logo"
            src={logoSrc}
            alt="IntelliHR logo"
            width={60}
            height={60}
            loading="eager"
            decoding="async"
          />
          <div className="site-brand-text">
            <h1>IntelliHR</h1>
            <p>Internal Employee Platform</p>
          </div>
        </Link>

        <nav className="site-nav-links" aria-label="Primary">
          <a href="/#home">Home</a>
          <a href="/#features">Features</a>
          <a href="/#roles">Roles</a>
          <a href="/#access">Access</a>
        </nav>

        <div className="site-nav-actions">
          <Link to="/auth/login" className="site-nav-btn site-nav-btn-secondary">
            Login
          </Link>
          <Link to="/auth/signup" className="site-nav-btn">
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
