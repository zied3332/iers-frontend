import { useEffect, useMemo, useState } from 'react';
import { getEmployeeSkills } from '../../../services/skills.service';

type SkillCategory = 'KNOWLEDGE' | 'KNOW_HOW' | 'SOFT';
type SkillLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPERT';

type EmployeeSkillItem = {
  _id: string;
  level: SkillLevel;
  dynamicScore: number;
  lastUpdated: string;
  projectLink?: string;
  requestedByEmployee?: boolean;
  skill?: {
    name?: string;
    category?: SkillCategory;
    description?: string;
  };
};

const scoreFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const ITEMS_PER_PAGE = 6;

export default function MySkillsPage() {
  const [skills, setSkills] = useState<EmployeeSkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingSkill, setSubmittingSkill] = useState(false);
  const [formError, setFormError] = useState('');

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] =
    useState<SkillCategory>('KNOWLEDGE');
  const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>('LOW');
  const [newSkillDescription, setNewSkillDescription] = useState('');
  const [newSkillLink, setNewSkillLink] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const employeeId = user?.employeeId || user?._id || user?.id;

        console.log('Stored user:', user);
        console.log('Employee ID used for skills:', employeeId);

        if (!employeeId) {
          setError('Employee identifier not found in local storage.');
          setSkills([]);
          return;
        }

        const data = await getEmployeeSkills(employeeId);
        console.log('Employee skills response:', data);

        const normalizedData = Array.isArray(data) ? data : [];

        setSkills(normalizedData);
      } catch (err) {
        console.error(err);
        setError('Failed to load your skills.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredSkills = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return skills;

    return skills.filter((item) => {
      return (
        (item.skill?.name || '').toLowerCase().includes(q) ||
        (item.skill?.category || '').toLowerCase().includes(q) ||
        (item.skill?.description || '').toLowerCase().includes(q) ||
        (item.level || '').toLowerCase().includes(q) ||
        (item.projectLink || '').toLowerCase().includes(q) ||
        String(item.dynamicScore ?? 0).includes(q)
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

  const getCategoryLabel = (category?: SkillCategory) => {
    switch (category) {
      case 'KNOWLEDGE':
        return 'Knowledge';
      case 'KNOW_HOW':
        return 'Know-how';
      case 'SOFT':
        return 'Soft skill';
      default:
        return '—';
    }
  };

  const getLevelLabel = (level?: SkillLevel) => {
    switch (level) {
      case 'LOW':
        return 'Low';
      case 'MEDIUM':
        return 'Medium';
      case 'HIGH':
        return 'High';
      case 'EXPERT':
        return 'Expert';
      default:
        return '—';
    }
  };

  const resetForm = () => {
    setNewSkillName('');
    setNewSkillCategory('KNOWLEDGE');
    setNewSkillLevel('LOW');
    setNewSkillDescription('');
    setNewSkillLink('');
    setFormError('');
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const isValidUrl = (value: string) => {
    if (!value.trim()) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddSkill = async () => {
    const employeeId = user?.employeeId || user?._id || user?.id;

    if (!employeeId) {
      setFormError('Employee identifier not found.');
      return;
    }

    if (!newSkillName.trim()) {
      setFormError('Skill name is required.');
      return;
    }

    if (!isValidUrl(newSkillLink)) {
      setFormError('Please enter a valid link.');
      return;
    }

    try {
      setSubmittingSkill(true);
      setFormError('');

      // FRONTEND MOCK FOR NOW
      // Replace this later with your backend service call
      const newSkillRequest: EmployeeSkillItem = {
        _id: `temp-${Date.now()}`,
        level: newSkillLevel,
        dynamicScore: 0,
        lastUpdated: new Date().toISOString(),
        projectLink: newSkillLink.trim() || undefined,
        requestedByEmployee: true,
        skill: {
          name: newSkillName.trim(),
          category: newSkillCategory,
          description: newSkillDescription.trim(),
        },
      };

      setSkills((prev) => [newSkillRequest, ...prev]);
      handleCloseModal();
    } catch (err) {
      console.error(err);
      setFormError('Failed to submit skill request.');
    } finally {
      setSubmittingSkill(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header skills-page-header">
        <div>
          <h1 className="page-title">My Skills</h1>
          <p className="page-subtitle">
            View your assigned skills, levels, and performance evolution.
          </p>
        </div>
      </div>

      <div className="content-card skills-card">
        <div className="skills-toolbar">
          <div className="skills-search-wrapper">
            <span className="skills-search-icon">⌕</span>
            <input
              type="text"
              placeholder="Search by skill, category, level, score..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="skills-search-input"
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <div className="skills-summary">
          <div className="skills-summary-card">
            <span className="skills-summary-label">Total skills</span>
            <strong className="skills-summary-value">{filteredSkills.length}</strong>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table skills-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Category</th>
                <th>Level</th>
                <th>Dynamic Score</th>
                <th>Last Updated</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    Loading your skills...
                  </td>
                </tr>
              ) : filteredSkills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No skills found.
                  </td>
                </tr>
              ) : (
                paginatedSkills.map((item) => (
                  <tr key={item._id}>
                    <td className="cell-title">
                      <div className="skill-name-block">
                        <span className="skill-name">{item.skill?.name || '—'}</span>
                        <span className="skill-description">
                          {item.skill?.description || 'No description available'}
                        </span>
                        {item.projectLink && (
                          <a
                            href={item.projectLink}
                            target="_blank"
                            rel="noreferrer"
                            className="skill-link"
                          >
                            View proof
                          </a>
                        )}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge badge-${(
                          item.skill?.category || ''
                        ).toLowerCase()}`}
                      >
                        {getCategoryLabel(item.skill?.category)}
                      </span>
                    </td>

                    <td>
                      <span className={`badge badge-${(item.level || '').toLowerCase()}`}>
                        {getLevelLabel(item.level)}
                      </span>
                    </td>

                    <td>
                      <span className="score-pill">
                        {scoreFormatter.format(Number(item.dynamicScore ?? 0))}
                      </span>
                    </td>

                    <td>
                      {item.lastUpdated
                        ? new Date(item.lastUpdated).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer skills-table-footer">
          <span className="table-footer-text">
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

      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-card skill-request-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Add New Skill</h2>
                <p>Add a skill with your level and references.</p>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseModal}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="alert alert-error">
                <span>{formError}</span>
              </div>
            )}

            <div className="modal-body skill-form-grid">
              <div className="form-group">
                <label>Skill name *</label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. React, Docker, Team Communication"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={newSkillCategory}
                  onChange={(e) =>
                    setNewSkillCategory(e.target.value as SkillCategory)
                  }
                  className="form-input"
                >
                  <option value="KNOWLEDGE">Knowledge</option>
                  <option value="KNOW_HOW">Know-how</option>
                  <option value="SOFT">Soft skill</option>
                </select>
              </div>

              <div className="form-group">
                <label>Level *</label>
                <select
                  value={newSkillLevel}
                  onChange={(e) => setNewSkillLevel(e.target.value as SkillLevel)}
                  className="form-input"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>

              <div className="form-group form-group-full">
                <label>Description</label>
                <textarea
                  value={newSkillDescription}
                  onChange={(e) => setNewSkillDescription(e.target.value)}
                  placeholder="Add a short description about your experience with this skill"
                  className="form-input form-textarea"
                  rows={4}
                />
              </div>

              <div className="form-group form-group-full">
                <label>Project / Certification link</label>
                <input
                  type="text"
                  value={newSkillLink}
                  onChange={(e) => setNewSkillLink(e.target.value)}
                  placeholder="https://github.com/... or certificate link"
                  className="form-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={handleCloseModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={handleAddSkill}
                disabled={submittingSkill}
              >
                {submittingSkill ? 'Submitting...' : 'Submit skill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}