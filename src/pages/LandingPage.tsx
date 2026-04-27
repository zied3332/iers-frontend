import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import './LandingPage.css';

const features = [
  {
    id: '01',
    title: 'Employee Profiles',
    description: 'Manage employee records, role details, departments, and personal workspace data.',
    image: '/images/feature-1.webp',
    alt: 'Employee dashboard',
    featured: true,
  },
  {
    id: '02',
    title: 'Skills Tracking',
    description: 'Follow employee capabilities, levels, and growth over time.',
    image: '/images/feature-2.webp',
    alt: 'Skills tracking',
  },
  {
    id: '03',
    title: 'Activities',
    description: 'Organize training, certifications, assignments, and requests.',
    image: '/images/bg3.webp',
    alt: 'Activities and training',
  },
  {
    id: '04',
    title: 'Notifications',
    description: 'Keep users updated with approvals, alerts, reminders, and changes.',
    image: '/images/bg4.webp',
    alt: 'Notifications system',
  },
];

const roles = [
  {
    title: 'HR Team',
    description: 'Manage access, employee data, skills, and internal workflows.',
    image: '/images/hr.webp',
    alt: 'HR team',
  },
  {
    title: 'Managers',
    description: 'Follow team activities, workforce progress, and internal requests.',
    image: '/images/manager.webp',
    alt: 'Manager',
    highlighted: true,
  },
  {
    title: 'Employees',
    description: 'Access your profile, activities, skills, notifications, and workspace.',
    image: '/images/employee.webp',
    alt: 'Employee',
  },
];

export default function LandingPage() {
  const heroImages = ['/images/bg1.webp', '/images/bg2.webp', '/images/bg3.webp', '/images/bg4.webp'];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroImages.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [heroImages.length]);

  return (
    <div className="landing-page">
      {heroImages.map((img, index) => (
        <div
          key={img}
          className={`landing-bg-layer ${index === activeIndex ? 'active' : ''}`}
          style={{ backgroundImage: `url(${img})` }}
        />
      ))}
      <div className="landing-bg-overlay" />

      <SiteNav />

      <main>
        <section className="landing-hero" id="home">
          <div className="landing-container landing-hero-wrapper">
            <div className="landing-hero-left">
              <span className="landing-badge">Internal company workspace</span>
              <h2>
                Welcome to your
                <span>smart HR workspace</span>
              </h2>
              <p className="landing-hero-text">
                A modern internal platform for employees, managers, and HR to manage
                profiles, skills, activities, requests, and notifications in one place.
              </p>

              <div className="landing-hero-actions">
                <Link to="/auth/login" className="landing-primary-btn">
                  Access platform
                </Link>
                <a href="#features" className="landing-secondary-btn">
                  Explore features
                </a>
              </div>

              <div className="landing-hero-stats">
                <div className="landing-mini-stat">
                  <strong>Profiles</strong>
                  <span>Centralized employee information</span>
                </div>
                <div className="landing-mini-stat">
                  <strong>Skills</strong>
                  <span>Track level and development</span>
                </div>
                <div className="landing-mini-stat">
                  <strong>Activities</strong>
                  <span>Training and requests management</span>
                </div>
              </div>
            </div>

            <div className="landing-hero-right">
              <div className="landing-hero-image-card">
                <img src="/images/hero-team.webp" alt="Team working together" />
                <div className="landing-hero-overlay-card">
                  <span>Company workspace</span>
                  <strong>Secure, modern, internal</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="features">
          <div className="landing-container">
            <div className="landing-section-heading">
              <span className="landing-badge landing-badge-soft">Platform features</span>
              <h3>Everything your company needs in one place</h3>
              <p>
                Clean tools for employee management, skills, activities, requests,
                and internal communication.
              </p>
            </div>

            <div className="landing-features-grid">
              {features.map((feature) => (
                <article
                  key={feature.id}
                  className={`landing-feature-card ${feature.featured ? 'landing-feature-large' : ''}`}
                >
                  <div className={`landing-feature-image ${feature.featured ? '' : 'landing-small-image'}`}>
                    <img src={feature.image} alt={feature.alt} />
                  </div>
                  <div className="landing-feature-content">
                    <span className="landing-feature-tag">{feature.id}</span>
                    <h4>{feature.title}</h4>
                    <p>{feature.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section" id="roles">
          <div className="landing-container">
            <div className="landing-section-heading">
              <span className="landing-badge landing-badge-soft">Who uses it</span>
              <h3>Built for every role in the company</h3>
              <p>
                The platform adapts to HR teams, managers, and employees with role-based access.
              </p>
            </div>

            <div className="landing-roles-grid">
              {roles.map((role) => (
                <article
                  key={role.title}
                  className={`landing-role-card ${role.highlighted ? 'landing-role-highlighted' : ''}`}
                >
                  <div className="landing-role-photo">
                    <img src={role.image} alt={role.alt} />
                  </div>
                  <h4>{role.title}</h4>
                  <p>{role.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-access-section" id="access">
          <div className="landing-container">
            <div className="landing-access-box">
              <div className="landing-access-left">
                <span className="landing-badge landing-dark-badge">Secure internal access</span>
                <h3>Ready to enter your workspace?</h3>
                <p>
                  This platform is reserved for authorized company users only.
                  Sign in to continue to your dashboard.
                </p>
              </div>

              <div className="landing-access-right">
                <Link to="/auth/login" className="landing-primary-btn landing-light-btn">
                  Go to login
                </Link>
                <a href="mailto:hr@company.com" className="landing-simple-link">
                  Contact HR support
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-content">
          <div>
            <h4>IntelliHR</h4>
            <p>Internal employee platform for company use only.</p>
          </div>

          <div className="landing-footer-links">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#roles">Roles</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
