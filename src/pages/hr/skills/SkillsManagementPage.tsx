import { useEffect, useMemo, useState } from 'react';
import {
  createSkill,
  deleteSkill,
  getAllSkills,
} from '../../../services/skills.service';

type SkillCategory = 'KNOWLEDGE' | 'KNOW_HOW' | 'SOFT';

type Skill = {
  _id: string;
  name: string;
  category: SkillCategory;
  description?: string;
};

const ITEMS_PER_PAGE = 8;

export default function SkillsManagementPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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

  const startItem = filteredSkills.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
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

      await createSkill({
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
      });

      setForm({
        name: '',
        category: 'KNOWLEDGE',
        description: '',
      });

      await loadSkills();
    } catch (err) {
      console.error(err);
      setError('Failed to create skill.');
    } finally {
      setSubmitting(false);
    }
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
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Skills</h1>
          <p className="page-subtitle">
            Manage employee skills and their categories.
          </p>
        </div>
      </div>

      <div className="content-card">
        <form className="entity-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Skill name</label>
              <input
                type="text"
                placeholder="Enter skill name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as SkillCategory })
                }
                className="form-input"
              >
                <option value="KNOWLEDGE">Knowledge</option>
                <option value="KNOW_HOW">Know-how</option>
                <option value="SOFT">Soft skill</option>
              </select>
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Description</label>
              <input
                type="text"
                placeholder="Enter skill description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="form-input"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : '+ Add Skill'}
            </button>
          </div>
        </form>
      </div>

      <div className="content-card">
        <div className="skills-toolbar">
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input
              type="text"
              placeholder="Search by name, category, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input clean-search-input"
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <div className="alert alert-success">
          <span>Total skills: {filteredSkills.length}</span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Skill Name</th>
                <th>Category</th>
                <th>Description</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="empty-state">
                    Loading skills...
                  </td>
                </tr>
              ) : filteredSkills.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-state">
                    No skills found.
                  </td>
                </tr>
              ) : (
                paginatedSkills.map((skill) => (
                  <tr key={skill._id}>
                    <td className="cell-title">{skill.name}</td>
                    <td>
                      <span className={`badge badge-${skill.category.toLowerCase()}`}>
                        {getCategoryLabel(skill.category)}
                      </span>
                    </td>
                    <td>{skill.description || '—'}</td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => handleDelete(skill._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>
            Showing {startItem} to {endItem} of {filteredSkills.length} skills
          </span>

          {filteredSkills.length > 0 && (
            <div className="pagination">
              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                className="pagination-btn"
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
  );
}