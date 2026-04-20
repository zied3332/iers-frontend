import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiX } from 'react-icons/fi';
import {
  createSkill,
  deleteSkill,
  getAllSkills,
  updateSkill,
} from '../../../services/skills.service';
import { getAllDomains, type Domain } from '../../../services/domains.service';

type SkillCategory = 'KNOWLEDGE' | 'KNOW_HOW' | 'SOFT';

type Skill = {
  _id: string;
  name: string;
  category: SkillCategory;
  description?: string;
  domainIds?: (string | Domain | Record<string, unknown>)[];
  /** Some APIs may expose domains under a different key */
  domains?: (string | Domain | Record<string, unknown>)[];
};

function sameMongoId(a: unknown, b: unknown): boolean {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

function rawSkillDomainList(skill: Skill): unknown[] {
  const s = skill as Skill & { domains?: unknown[] };
  const fromIds = s.domainIds;
  if (Array.isArray(fromIds) && fromIds.length) return fromIds;
  if (Array.isArray(s.domains) && s.domains.length) return s.domains;
  return Array.isArray(fromIds) ? fromIds : [];
}

/** One entry per linked domain, stable order from the API */
function getSkillDomainEntries(skill: Skill, domainsList: Domain[]): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const entry of rawSkillDomainList(skill)) {
    if (entry == null) continue;
    if (typeof entry === 'string') {
      const id = String(entry).trim();
      if (!id) continue;
      const name =
        domainsList.find((d) => sameMongoId(d._id, id))?.name?.trim() || id;
      out.push({ id, name });
      continue;
    }
    if (typeof entry === 'object') {
      const o = entry as Record<string, unknown>;
      const idRaw = o._id ?? o.id;
      const id = idRaw != null ? String(idRaw).trim() : '';
      let name = typeof o.name === 'string' ? o.name.trim() : '';
      if (!name && id) {
        name = domainsList.find((d) => sameMongoId(d._id, id))?.name?.trim() || '';
      }
      if (!name && !id) continue;
      out.push({ id: id || name, name: name || id || '—' });
    }
  }
  return out;
}

const ITEMS_PER_PAGE = 8;

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

  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '22px',
    boxShadow: '0 6px 24px rgba(15, 23, 42, 0.04)',
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

  selectTableDomains: {
    width: '100%',
    maxWidth: '100%',
    height: '44px',
    padding: '0 12px',
    borderRadius: '12px',
    border: '1px solid var(--input-border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    outline: 'none',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
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
    background: '#167c5a',
    color: '#fff',
    border: '1px solid #167c5a',
    boxShadow: '0 10px 24px rgba(22, 124, 90, 0.16)',
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
    background: '#ecfdf3',
    color: '#067647',
    border: '1px solid #abefc6',
    fontWeight: 800,
    fontSize: '13px',
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
    background: 'var(--card)',
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

  categoryPill: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '7px 12px',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
    fontSize: '12px',
    fontWeight: 800,
    whiteSpace: 'nowrap',
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
    color: '#0f766e',
    background: '#f0fdfa',
    border: '1px solid #99f6e4',
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
    background: '#167c5a',
    color: '#fff',
    border: '1px solid #167c5a',
  } as React.CSSProperties,
} as const;

export default function SkillsManagementPage() {
  const { pathname } = useLocation();
  const domainsAdminPath = pathname.replace(/\/skills$/, '/domains');

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);

  const [form, setForm] = useState<{
    name: string;
    category: SkillCategory;
    description: string;
    domainIds: string[];
  }>({
    name: '',
    category: 'KNOWLEDGE',
    description: '',
    domainIds: [],
  });
  const [domainPicker, setDomainPicker] = useState('');
  /** Per-skill "Add domain…" select value in the skills table (key = skill._id) */
  const [tableDomainPicker, setTableDomainPicker] = useState<Record<string, string>>({});
  const [tableDomainSavingId, setTableDomainSavingId] = useState<string | null>(null);

  const loadSkills = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllSkills();
      setSkills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('Failed to load skills.');
    } finally {
      setLoading(false);
    }
  };

  const refreshSkillsList = async () => {
    try {
      setError('');
      const data = await getAllSkills();
      setSkills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('Failed to load skills.');
    }
  };

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);
      const data = await getAllDomains();
      setDomains(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDomains(false);
    }
  };

  useEffect(() => {
    void Promise.all([loadSkills(), loadDomains()]);
  }, []);

  const getSkillDomainIds = (skill: Skill): string[] =>
    getSkillDomainEntries(skill, domains).map((e) => e.id);

  const getSkillDomainNames = (skill: Skill): string[] =>
    getSkillDomainEntries(skill, domains).map((e) => e.name).filter(Boolean);

  const filteredSkills = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return skills;

    return skills.filter((skill) => {
      return (
        skill.name.toLowerCase().includes(q) ||
        skill.category.toLowerCase().includes(q) ||
        (skill.description || '').toLowerCase().includes(q) ||
        getSkillDomainNames(skill).join(' ').toLowerCase().includes(q)
      );
    });
  }, [skills, search, domains]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredSkills.length / ITEMS_PER_PAGE));

  const paginatedSkills = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredSkills.slice(start, end);
  }, [filteredSkills, currentPage]);

  const startItem =
    filteredSkills.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredSkills.length);

  const getCategoryLabel = (category: SkillCategory) => {
    switch (category) {
      case 'KNOWLEDGE':
        return 'Knowledge';
      case 'KNOW_HOW':
        return 'Know-how';
      case 'SOFT':
        return 'Soft skill';
      default:
        return category;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Skill name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (editingSkillId) {
        await updateSkill(editingSkillId, {
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
          domainIds: form.domainIds,
        });
      } else {
        await createSkill({
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
          domainIds: form.domainIds,
        });
      }

      setForm({
        name: '',
        category: 'KNOWLEDGE',
        description: '',
        domainIds: [],
      });
      setDomainPicker('');
      setEditingSkillId(null);

      await loadSkills();
    } catch (err) {
      console.error(err);
      setError(editingSkillId ? 'Failed to update skill.' : 'Failed to create skill.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (skill: Skill) => {
    setError('');
    setEditingSkillId(skill._id);
    setForm({
      name: skill.name || '',
      category: skill.category,
      description: skill.description || '',
      domainIds: getSkillDomainIds(skill),
    });
    setDomainPicker('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSkillId(null);
    setError('');
    setForm({
      name: '',
      category: 'KNOWLEDGE',
      description: '',
      domainIds: [],
    });
    setDomainPicker('');
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this skill?');
    if (!confirmed) return;

    try {
      setError('');
      await deleteSkill(id);
      await loadSkills();
    } catch (err) {
      console.error(err);
      setError('Failed to delete skill.');
    }
  };

  const handleUpdateSkillDomains = async (skill: Skill, domainIds: string[]) => {
    try {
      setError('');
      setTableDomainSavingId(skill._id);
      await updateSkill(skill._id, { domainIds });
      await refreshSkillsList();
      if (editingSkillId === skill._id) {
        setForm((prev) => ({ ...prev, domainIds }));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update domains for this skill.');
    } finally {
      setTableDomainSavingId(null);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Skills Management</h1>
            <p style={styles.subtitle}>
              Create, organize, and update skills by category. Domain categories are
              maintained on the{' '}
              <Link
                to={domainsAdminPath}
                style={{ color: '#167c5a', fontWeight: 700, textDecoration: 'none' }}
              >
                Domain management
              </Link>{' '}
              page.
            </p>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardBody}>
            <div>
              <h2 style={styles.sectionTitle}>
                {editingSkillId ? 'Edit skill' : 'Add new skill'}
              </h2>
              <p style={styles.sectionHint}>
                Keep skill records clear and structured so they are easier to reuse
                across employees and activities.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '18px' }}>
                <div>
                  <label style={styles.label}>Skill name</label>
                  <input
                    type="text"
                    placeholder="Enter skill name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={styles.input}
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '16px',
                    alignItems: 'start',
                  }}
                >
                  <div>
                    <label style={styles.label}>Category</label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value as SkillCategory })
                      }
                      style={styles.input}
                    >
                      <option value="KNOWLEDGE">Knowledge</option>
                      <option value="KNOW_HOW">Know-how</option>
                      <option value="SOFT">Soft skill</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>Domains</label>
                    {loadingDomains && domains.length === 0 ? (
                      <select disabled style={styles.input} aria-label="Loading domains">
                        <option value="">Loading domains…</option>
                      </select>
                    ) : domains.length === 0 ? (
                      <div>
                        <select disabled style={styles.input} aria-label="No domains">
                          <option value="">No domains in catalog yet</option>
                        </select>
                        <p
                          style={{
                            margin: '8px 0 0',
                            fontSize: '13px',
                            color: 'var(--muted)',
                            lineHeight: 1.5,
                          }}
                        >
                          Create domains on the{' '}
                          <Link
                            to={domainsAdminPath}
                            style={{ color: '#167c5a', fontWeight: 700, textDecoration: 'none' }}
                          >
                            Domain management
                          </Link>{' '}
                          page.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <select
                            value={domainPicker}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) return;
                              setForm((prev) =>
                                prev.domainIds.includes(v)
                                  ? prev
                                  : { ...prev, domainIds: [...prev.domainIds, v] },
                              );
                              setDomainPicker('');
                              e.target.blur();
                            }}
                            style={{ ...styles.input, flex: 1, minWidth: 0 }}
                            aria-label="Add a domain"
                            title={
                              form.domainIds.length
                                ? form.domainIds
                                    .map(
                                      (id) => domains.find((d) => d._id === id)?.name || id,
                                    )
                                    .join(', ')
                                : undefined
                            }
                          >
                            <option value="">
                              {domains.filter((d) => !form.domainIds.includes(d._id)).length
                                ? 'Add domain…'
                                : form.domainIds.length
                                  ? 'All domains added'
                                  : '—'}
                            </option>
                            {domains
                              .filter((d) => !form.domainIds.includes(d._id))
                              .map((domain) => (
                                <option key={domain._id} value={domain._id}>
                                  {domain.name}
                                </option>
                              ))}
                          </select>
                          {form.domainIds.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, domainIds: [] }))}
                              style={{ ...styles.btn, ...styles.btnGhost, height: '48px', flexShrink: 0 }}
                            >
                              Clear
                            </button>
                          ) : null}
                        </div>
                        {form.domainIds.length > 0 ? (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                              marginTop: '8px',
                            }}
                          >
                            {form.domainIds.map((id) => {
                              const name = domains.find((d) => d._id === id)?.name || id;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      domainIds: prev.domainIds.filter((x) => x !== id),
                                    }))
                                  }
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 10px',
                                    borderRadius: '999px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface-2, #f8fafc)',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: 'var(--text)',
                                    cursor: 'pointer',
                                  }}
                                  title={`Remove ${name}`}
                                >
                                  {name}
                                  <FiX size={14} aria-hidden />
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Description</label>
                  <textarea
                    placeholder="Enter skill description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    style={styles.textarea}
                  />
                </div>
              </div>

              <div style={styles.formActions}>
                <button
                  type="submit"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  disabled={submitting}
                >
                  <FiPlus size={16} />
                  {submitting
                    ? editingSkillId
                      ? 'Saving...'
                      : 'Adding...'
                    : editingSkillId
                      ? 'Save changes'
                      : 'Add skill'}
                </button>

                {editingSkillId && (
                  <button
                    type="button"
                    style={{ ...styles.btn, ...styles.btnGhost }}
                    onClick={handleCancelEdit}
                    disabled={submitting}
                  >
                    <FiX size={16} />
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardBody}>
            <div style={styles.toolbar}>
              <div style={styles.searchWrap}>
                <FiSearch size={16} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search by name, category, or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.searchInput}
                />
              </div>

              <div style={styles.countBadge}>Total skills: {filteredSkills.length}</div>
            </div>

            {error && <div style={styles.alertError}>{error}</div>}

            <div style={{ height: error ? '14px' : 0 }} />

            <div style={styles.tableOuter}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: '26%' }}>Skill name</th>
                    <th style={{ ...styles.th, width: '18%' }}>Category</th>
                    <th style={{ ...styles.th, width: '24%' }}>Domains</th>
                    <th style={{ ...styles.th, width: '30%' }}>Description</th>
                    <th style={{ ...styles.th, width: '16%', textAlign: 'center' }}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={styles.empty}>
                        Loading skills...
                      </td>
                    </tr>
                  ) : filteredSkills.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={styles.empty}>
                        No skills found.
                      </td>
                    </tr>
                  ) : (
                    paginatedSkills.map((skill, index) => {
                      const skillDomainIds = getSkillDomainIds(skill);
                      const domainEntries = getSkillDomainEntries(skill, domains);
                      const domainLabel =
                        domainEntries.map((e) => e.name).join(', ') || '—';
                      const rowSaving = tableDomainSavingId === skill._id;
                      const availableCount = domains.filter(
                        (d) => !skillDomainIds.some((id) => sameMongoId(id, d._id)),
                      ).length;
                      return (
                        <tr
                          key={skill._id}
                          style={{
                            background: index % 2 === 1 ? '#fcfdff' : 'transparent',
                          }}
                        >
                          <td style={{ ...styles.td, ...styles.nameCell }}>{skill.name}</td>

                          <td style={styles.td}>
                            <span style={styles.categoryPill}>
                              {getCategoryLabel(skill.category)}
                            </span>
                          </td>

                          <td style={styles.td}>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                minWidth: 0,
                              }}
                            >
                              {loadingDomains && domains.length === 0 ? (
                                <select
                                  disabled
                                  style={styles.selectTableDomains}
                                  aria-label="Loading domains"
                                >
                                  <option value="">Loading domains…</option>
                                </select>
                              ) : domains.length === 0 ? (
                                <div>
                                  <select
                                    disabled
                                    style={styles.selectTableDomains}
                                    aria-label="No domains"
                                  >
                                    <option value="">No domains in catalog</option>
                                  </select>
                                  <p
                                    style={{
                                      margin: '6px 0 0',
                                      fontSize: '12px',
                                      color: 'var(--muted)',
                                      lineHeight: 1.45,
                                    }}
                                  >
                                    <Link
                                      to={domainsAdminPath}
                                      style={{
                                        color: '#167c5a',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                      }}
                                    >
                                      Domain management
                                    </Link>
                                  </p>
                                </div>
                              ) : (
                                <select
                                  value={tableDomainPicker[skill._id] ?? ''}
                                  disabled={rowSaving}
                                  aria-label={`Assign domain to ${skill.name}. Current: ${domainLabel}`}
                                  title={domainLabel}
                                  style={styles.selectTableDomains}
                                  onChange={(e) => {
                                    const v = e.target.value.trim();
                                    if (!v) return;
                                    if (skillDomainIds.some((id) => sameMongoId(id, v))) {
                                      setTableDomainPicker((p) => ({ ...p, [skill._id]: '' }));
                                      return;
                                    }
                                    const next = [...skillDomainIds, v];
                                    setTableDomainPicker((p) => ({ ...p, [skill._id]: '' }));
                                    void handleUpdateSkillDomains(skill, next);
                                  }}
                                >
                                  <option value="">
                                    {availableCount
                                      ? 'Add domain…'
                                      : skillDomainIds.length
                                        ? 'All domains added'
                                        : '—'}
                                  </option>
                                  {domains
                                    .filter(
                                      (d) =>
                                        !skillDomainIds.some((id) => sameMongoId(id, d._id)),
                                    )
                                    .map((d) => (
                                      <option key={d._id} value={d._id}>
                                        {d.name}
                                      </option>
                                    ))}
                                </select>
                              )}
                              {domainEntries.length > 0 ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px',
                                  }}
                                >
                                  {domainEntries.map((e) => (
                                    <button
                                      key={`${skill._id}_${e.id}`}
                                      type="button"
                                      disabled={rowSaving}
                                      onClick={() => {
                                        const next = skillDomainIds.filter(
                                          (id) => !sameMongoId(id, e.id),
                                        );
                                        void handleUpdateSkillDomains(skill, next);
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 8px',
                                        borderRadius: '999px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--surface-2, #f8fafc)',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: 'var(--text)',
                                        cursor: rowSaving ? 'wait' : 'pointer',
                                      }}
                                      title={`Remove ${e.name}`}
                                    >
                                      {e.name}
                                      <FiX size={12} aria-hidden />
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </td>

                          <td style={styles.td}>{skill.description || '—'}</td>

                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            <div style={styles.actions}>
                              <button
                                type="button"
                                style={{ ...styles.iconBtn, ...styles.editBtn }}
                                onClick={() => handleStartEdit(skill)}
                                title="Edit skill"
                                aria-label={`Edit ${skill.name}`}
                              >
                                <FiEdit2 size={16} />
                              </button>

                              <button
                                type="button"
                                style={{ ...styles.iconBtn, ...styles.deleteBtn }}
                                onClick={() => handleDelete(skill._id)}
                                title="Delete skill"
                                aria-label={`Delete ${skill.name}`}
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={styles.footer}>
              <span style={styles.footerText}>
                Showing {startItem} to {endItem} of {filteredSkills.length} skills
              </span>

              {filteredSkills.length > 0 && (
                <div style={styles.pagination}>
                  <button
                    type="button"
                    style={styles.pageBtn}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      style={
                        currentPage === page
                          ? { ...styles.pageBtn, ...styles.pageBtnActive }
                          : styles.pageBtn
                      }
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    style={styles.pageBtn}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
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