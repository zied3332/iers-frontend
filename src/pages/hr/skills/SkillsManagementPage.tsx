import { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiX } from 'react-icons/fi';
import {
  createSkill,
  deleteSkill,
  getAllSkills,
  updateSkill,
} from '../../../services/skills.service';

type SkillCategory = 'KNOWLEDGE' | 'KNOW_HOW' | 'SOFT';

type Skill = {
  _id: string;
  name: string;
  category: SkillCategory;
  description?: string;
};

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
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    category: SkillCategory;
    description: string;
  }>({
    name: '',
    category: 'KNOWLEDGE',
    description: '',
  });

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

  useEffect(() => {
    loadSkills();
  }, []);

  const filteredSkills = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return skills;

    return skills.filter((skill) => {
      return (
        skill.name.toLowerCase().includes(q) ||
        skill.category.toLowerCase().includes(q) ||
        (skill.description || '').toLowerCase().includes(q)
      );
    });
  }, [skills, search]);

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
        });
      } else {
        await createSkill({
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
        });
      }

      setForm({
        name: '',
        category: 'KNOWLEDGE',
        description: '',
      });
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
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSkillId(null);
    setError('');
    setForm({
      name: '',
      category: 'KNOWLEDGE',
      description: '',
    });
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

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Skills Management</h1>
            <p style={styles.subtitle}>
              Create, organize, and update skills by category in a cleaner and more
              scalable workspace.
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
              <div style={styles.formGrid}>
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

                <div style={styles.fullWidth}>
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
                    <th style={{ ...styles.th, width: '40%' }}>Description</th>
                    <th style={{ ...styles.th, width: '16%', textAlign: 'center' }}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={styles.empty}>
                        Loading skills...
                      </td>
                    </tr>
                  ) : filteredSkills.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={styles.empty}>
                        No skills found.
                      </td>
                    </tr>
                  ) : (
                    paginatedSkills.map((skill, index) => (
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
                    ))
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