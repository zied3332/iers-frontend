import { useEffect, useMemo, useState } from 'react';
import { getEmployeeSkills } from '../../../services/skills.service';

type SkillCategory = 'KNOWLEDGE' | 'KNOW_HOW' | 'SOFT';
type SkillLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPERT';

type EmployeeSkillItem = {
  _id: string;
  level: SkillLevel;
  dynamicScore: number;
  lastUpdated: string;
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

export default function MySkillsPage() {
  const [skills, setSkills] = useState<EmployeeSkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

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

        setSkills(Array.isArray(data) ? data : []);
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
        (item.level || '').toLowerCase().includes(q) ||
        String(item.dynamicScore ?? 0).includes(q)
      );
    });
  }, [skills, search]);

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

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Skills</h1>
          <p className="page-subtitle">
            View your assigned skills, levels, and dynamic scores.
          </p>
        </div>
      </div>

      <div className="content-card">
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search by skill, category, level, or score..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
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
                filteredSkills.map((item) => (
                  <tr key={item._id}>
                    <td className="cell-title">{item.skill?.name || '—'}</td>
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
                      <span
                        className={`badge badge-${(item.level || '').toLowerCase()}`}
                      >
                        {getLevelLabel(item.level)}
                      </span>
                    </td>
                    <td>{scoreFormatter.format(Number(item.dynamicScore ?? 0))}</td>
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

        <div className="table-footer">
          <span>
            Showing {filteredSkills.length} of {filteredSkills.length} skills
          </span>
        </div>
      </div>
    </div>
  );
}