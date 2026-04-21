import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiX } from 'react-icons/fi';
import {
  createDomain,
  deleteDomain,
  getAllDomains,
  updateDomain,
  type Domain,
} from '../../../services/domains.service';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    color: 'var(--text)',
    padding: 'clamp(16px, 2vw, 28px)',
  } as React.CSSProperties,

  container: {
    width: '100%',
    maxWidth: 'min(1600px, 100%)',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
  } as React.CSSProperties,

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  title: {
    margin: 0,
    fontSize: 'clamp(28px, 2.6vw, 42px)',
    fontWeight: 800,
    lineHeight: 1.1,
    color: 'var(--text)',
  } as React.CSSProperties,

  subtitle: {
    margin: '10px 0 0',
    maxWidth: '760px',
    color: 'var(--muted)',
    fontSize: '15px',
    lineHeight: 1.6,
  } as React.CSSProperties,

  inlineLink: {
    color: 'var(--primary-soft-text)',
    fontWeight: 700,
    textDecoration: 'none',
  } as React.CSSProperties,

  /** Form block: lighter, tighter shadow */
  cardForm: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '22px',
    boxShadow:
      '0 2px 8px rgba(15, 23, 42, 0.04), 0 12px 28px rgba(15, 23, 42, 0.07)',
    overflow: 'hidden',
  } as React.CSSProperties,

  /** List block: deeper shadow so it reads as a separate panel */
  cardTable: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '22px',
    boxShadow:
      '0 4px 14px rgba(15, 23, 42, 0.06), 0 20px 44px rgba(15, 23, 42, 0.09)',
    overflow: 'hidden',
  } as React.CSSProperties,

  cardBody: {
    padding: 'clamp(18px, 2vw, 28px)',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '18px',
    fontWeight: 800,
    margin: 0,
    color: 'var(--text)',
  } as React.CSSProperties,

  sectionHint: {
    margin: '6px 0 0',
    fontSize: '14px',
    color: 'var(--muted)',
    lineHeight: 1.5,
  } as React.CSSProperties,

  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
    marginTop: '18px',
  } as React.CSSProperties,

  fullWidth: {
    gridColumn: '1 / -1',
  } as React.CSSProperties,

  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  } as React.CSSProperties,

  input: {
    width: '100%',
    height: '48px',
    padding: '0 14px',
    borderRadius: '14px',
    border: '1px solid var(--input-border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    outline: 'none',
    fontSize: '14px',
    fontWeight: 500,
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    minHeight: '96px',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid var(--input-border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    outline: 'none',
    fontSize: '14px',
    fontWeight: 500,
    resize: 'vertical',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  formActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '18px',
  } as React.CSSProperties,

  btn: {
    height: '44px',
    padding: '0 16px',
    borderRadius: '12px',
    border: '1px solid var(--input-border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  btnPrimary: {
    background: 'var(--primary)',
    color: 'var(--primary-on)',
    border: '1px solid var(--primary)',
    boxShadow: '0 10px 24px var(--primary-border)',
  } as React.CSSProperties,

  btnGhost: {
    background: 'transparent',
    color: 'var(--muted)',
    border: '1px solid var(--border)',
  } as React.CSSProperties,

  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  } as React.CSSProperties,

  searchWrap: {
    position: 'relative',
    width: 'min(420px, 100%)',
    flex: '1 1 320px',
  } as React.CSSProperties,

  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--muted)',
  } as React.CSSProperties,

  searchInput: {
    width: '100%',
    height: '46px',
    padding: '0 14px 0 40px',
    borderRadius: '14px',
    border: '1px solid var(--input-border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    outline: 'none',
    fontSize: '14px',
    fontWeight: 500,
  } as React.CSSProperties,

  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'var(--primary-weak)',
    color: 'var(--primary-soft-text)',
    border: '1px solid var(--primary-border)',
    fontWeight: 800,
    fontSize: '13px',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  alertError: {
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid #fecaca',
    background: '#fff7f7',
    color: '#b91c1c',
    fontWeight: 700,
    fontSize: '14px',
  } as React.CSSProperties,

  tableOuter: {
    width: '100%',
    overflowX: 'auto',
    border: '1px solid var(--border)',
    borderRadius: '18px',
    background: 'var(--surface)',
  } as React.CSSProperties,

  table: {
    width: '100%',
    minWidth: '760px',
    borderCollapse: 'separate',
    borderSpacing: 0,
    tableLayout: 'fixed',
  } as React.CSSProperties,

  th: {
    padding: '16px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#667085',
    background: '#f8fafc',
    borderBottom: '1px solid var(--border)',
  } as React.CSSProperties,

  td: {
    padding: '16px',
    fontSize: '14px',
    color: 'var(--text)',
    borderBottom: '1px solid #eef2f6',
    verticalAlign: 'middle',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
  } as React.CSSProperties,

  nameCell: {
    fontWeight: 800,
    color: 'var(--text)',
  } as React.CSSProperties,

  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  iconBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  } as React.CSSProperties,

  editBtn: {
    color: 'var(--primary-soft-text)',
    background: 'var(--primary-weak)',
    border: '1px solid var(--primary-border)',
  } as React.CSSProperties,

  deleteBtn: {
    color: '#b42318',
    background: '#fff5f5',
    border: '1px solid #f3c7c7',
  } as React.CSSProperties,

  empty: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--muted)',
    fontWeight: 600,
  } as React.CSSProperties,
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    marginTop: '16px',
  } as React.CSSProperties,

  footerText: {
    color: 'var(--muted)',
    fontSize: '14px',
    fontWeight: 600,
  } as React.CSSProperties,

  pagination: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  pageBtn: {
    minWidth: '40px',
    height: '40px',
    padding: '0 12px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontWeight: 700,
    cursor: 'pointer',
  } as React.CSSProperties,

  pageBtnActive: {
    background: 'var(--primary)',
    color: 'var(--primary-on)',
    border: '1px solid var(--primary)',
  } as React.CSSProperties,
} as const;

const DOMAINS_PAGE_SIZE = 10;

export default function DomainManagementPage() {
  const { pathname } = useLocation();
  const skillsAdminPath = pathname.replace(/\/domains$/, '/skills');

  const [domains, setDomains] = useState<Domain[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [submittingDomain, setSubmittingDomain] = useState(false);
  const [domainSearch, setDomainSearch] = useState('');
  const [domainError, setDomainError] = useState('');
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [domainForm, setDomainForm] = useState<{ name: string; description: string }>({
    name: '',
    description: '',
  });
  const [currentPage, setCurrentPage] = useState(1);

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);
      setDomainError('');
      const data = await getAllDomains();
      setDomains(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setDomainError('Failed to load domains.');
    } finally {
      setLoadingDomains(false);
    }
  };

  useEffect(() => {
    void loadDomains();
  }, []);

  const filteredDomains = useMemo(() => {
    const q = domainSearch.trim().toLowerCase();
    if (!q) return domains;
    return domains.filter(
      (domain) =>
        String(domain.name || '').toLowerCase().includes(q) ||
        String(domain.description || '').toLowerCase().includes(q),
    );
  }, [domains, domainSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredDomains.length / DOMAINS_PAGE_SIZE));

  const paginatedDomains = useMemo(() => {
    const start = (currentPage - 1) * DOMAINS_PAGE_SIZE;
    return filteredDomains.slice(start, start + DOMAINS_PAGE_SIZE);
  }, [filteredDomains, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [domainSearch]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const startItem =
    filteredDomains.length === 0 ? 0 : (currentPage - 1) * DOMAINS_PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * DOMAINS_PAGE_SIZE, filteredDomains.length);

  const handleSubmitDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainForm.name.trim()) {
      setDomainError('Domain name is required.');
      return;
    }
    try {
      setSubmittingDomain(true);
      setDomainError('');
      if (editingDomainId) {
        await updateDomain(editingDomainId, {
          name: domainForm.name.trim(),
          description: domainForm.description.trim(),
        });
      } else {
        await createDomain({
          name: domainForm.name.trim(),
          description: domainForm.description.trim(),
        });
      }
      setEditingDomainId(null);
      setDomainForm({ name: '', description: '' });
      await loadDomains();
    } catch (err) {
      console.error(err);
      setDomainError(editingDomainId ? 'Failed to update domain.' : 'Failed to create domain.');
    } finally {
      setSubmittingDomain(false);
    }
  };

  const startEditDomain = (domain: Domain) => {
    setDomainError('');
    setEditingDomainId(domain._id);
    setDomainForm({
      name: String(domain.name || ''),
      description: String(domain.description || ''),
    });
  };

  const cancelDomainEdit = () => {
    setEditingDomainId(null);
    setDomainForm({ name: '', description: '' });
    setDomainError('');
  };

  const handleDeleteDomain = async (id: string) => {
    const confirmed = window.confirm('Delete this domain? It will be removed from linked skills.');
    if (!confirmed) return;
    try {
      setDomainError('');
      await deleteDomain(id);
      await loadDomains();
      if (editingDomainId === id) cancelDomainEdit();
    } catch (err) {
      console.error(err);
      setDomainError('Failed to delete domain.');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Domain management</h1>
            <p style={styles.subtitle}>
              Create and maintain domains used to classify skills. To attach domains to
              individual skills, use{' '}
              <Link to={skillsAdminPath} style={styles.inlineLink}>
                Skills management
              </Link>
              .
            </p>
          </div>
        </div>

        <div style={styles.cardForm}>
          <div style={styles.cardBody}>
            <div>
              <h2 style={styles.sectionTitle}>
                {editingDomainId ? 'Edit domain' : 'Add domain'}
              </h2>
              <p style={styles.sectionHint}>
                Domains group your skill catalog so filters and employee experience stay
                consistent at scale.
              </p>
            </div>

            <form onSubmit={handleSubmitDomain} style={{ marginTop: '14px' }}>
              <div style={styles.formGrid}>
                <div>
                  <label style={styles.label}>Domain name</label>
                  <input
                    type="text"
                    placeholder="Enter domain name"
                    value={domainForm.name}
                    onChange={(e) =>
                      setDomainForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    style={styles.input}
                  />
                </div>
                <div style={styles.fullWidth}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    placeholder="Optional domain description"
                    value={domainForm.description}
                    onChange={(e) =>
                      setDomainForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    style={styles.textarea}
                  />
                </div>
              </div>
              <div style={styles.formActions}>
                <button
                  type="submit"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  disabled={submittingDomain}
                >
                  <FiPlus size={16} />
                  {submittingDomain
                    ? editingDomainId
                      ? 'Saving...'
                      : 'Adding...'
                    : editingDomainId
                      ? 'Save domain'
                      : 'Add domain'}
                </button>
                {editingDomainId && (
                  <button
                    type="button"
                    style={{ ...styles.btn, ...styles.btnGhost }}
                    onClick={cancelDomainEdit}
                    disabled={submittingDomain}
                  >
                    <FiX size={16} />
                    Cancel edit
                  </button>
                )}
              </div>
            </form>

            {domainError && (
              <div style={{ ...styles.alertError, marginTop: '10px' }}>{domainError}</div>
            )}
          </div>
        </div>

        <div style={styles.cardTable}>
          <div style={styles.cardBody}>
            <div>
              <h2 style={styles.sectionTitle}>All domains</h2>
              <p style={styles.sectionHint}>Search and manage existing domains.</p>
            </div>

            <div style={{ ...styles.toolbar, marginTop: '14px' }}>
              <div style={{ ...styles.searchWrap, flex: '1 1 280px' }}>
                <FiSearch size={16} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search domains..."
                  value={domainSearch}
                  onChange={(e) => setDomainSearch(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              <div style={styles.countBadge}>Total domains: {filteredDomains.length}</div>
            </div>

            <div style={{ ...styles.tableOuter, marginTop: '12px' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: '32%' }}>Domain</th>
                    <th style={{ ...styles.th, width: '52%' }}>Description</th>
                    <th style={{ ...styles.th, width: '16%', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDomains ? (
                    <tr>
                      <td colSpan={3} style={styles.empty}>
                        Loading domains...
                      </td>
                    </tr>
                  ) : filteredDomains.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={styles.empty}>
                        No domains found.
                      </td>
                    </tr>
                  ) : (
                    paginatedDomains.map((domain, index) => (
                      <tr
                        key={domain._id}
                        style={{ background: index % 2 === 1 ? '#fcfdff' : 'transparent' }}
                      >
                        <td style={{ ...styles.td, ...styles.nameCell }}>{domain.name}</td>
                        <td style={styles.td}>{domain.description || '—'}</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <div style={styles.actions}>
                            <button
                              type="button"
                              style={{ ...styles.iconBtn, ...styles.editBtn }}
                              onClick={() => startEditDomain(domain)}
                              title="Edit domain"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              type="button"
                              style={{ ...styles.iconBtn, ...styles.deleteBtn }}
                              onClick={() => void handleDeleteDomain(domain._id)}
                              title="Delete domain"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={styles.footer}>
              <span style={styles.footerText}>
                Showing {startItem} to {endItem} of {filteredDomains.length} domains
              </span>

              {filteredDomains.length > 0 && (
                <div style={styles.pagination}>
                  <button
                    type="button"
                    style={styles.pageBtn}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      style={
                        currentPage === p
                          ? { ...styles.pageBtn, ...styles.pageBtnActive }
                          : styles.pageBtn
                      }
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    type="button"
                    style={styles.pageBtn}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
