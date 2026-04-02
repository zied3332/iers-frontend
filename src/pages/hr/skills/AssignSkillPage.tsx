import { useEffect, useMemo, useState } from 'react';
import { assignSkill, getAllSkills } from '../../../services/skills.service';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type Skill = {
  _id: string;
  name: string;
  category: 'KNOWLEDGE' | 'KNOW_HOW' | 'SOFT';
  description?: string;
};

type Employee = {
  _id: string;
  name: string;
  email?: string;
  department?: string;
};

type SkillLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPERT';

export default function AssignSkillPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [searchSkill, setSearchSkill] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<{
    employeeId: string;
    skillId: string;
    level: SkillLevel;
    dynamicScore: number;
  }>({
    employeeId: '',
    skillId: '',
    level: 'LOW',
    dynamicScore: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const [skillsData, employeesRes] = await Promise.all([
          getAllSkills(),
          axios.get(`${API}/users?role=EMPLOYEE`),
        ]);

        setSkills(Array.isArray(skillsData) ? skillsData : []);
        setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
      } catch (err) {
        console.error(err);
        setError('Failed to load employees and skills.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = searchEmployee.trim().toLowerCase();
    if (!q) return employees;

    return employees.filter((emp) => {
      return (
        (emp.name || '').toLowerCase().includes(q) ||
        (emp.email || '').toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q)
      );
    });
  }, [employees, searchEmployee]);

  const filteredSkills = useMemo(() => {
    const q = searchSkill.trim().toLowerCase();
    if (!q) return skills;

    return skills.filter((skill) => {
      return (
        (skill.name || '').toLowerCase().includes(q) ||
        (skill.category || '').toLowerCase().includes(q) ||
        (skill.description || '').toLowerCase().includes(q)
      );
    });
  }, [skills, searchSkill]);

  const getLevelLabel = (level: SkillLevel) => {
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
        return level;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.employeeId || !form.skillId) {
      setSuccess('');
      setError('Please select both employee and skill.');
      return;
    }

    if (form.dynamicScore < 0) {
      setSuccess('');
      setError('Dynamic score cannot be negative.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await assignSkill(form as any);

      setForm({
        employeeId: '',
        skillId: '',
        level: 'LOW',
        dynamicScore: 0,
      });

      setSuccess('Skill assigned successfully.');
    } catch (err) {
      console.error(err);
      setSuccess('');
      setError('Failed to assign skill.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Assign Skills</h1>
          <p className="page-subtitle">
            Assign a skill to an employee with level and dynamic score.
          </p>
        </div>
      </div>

      <div className="content-card">
        <form className="entity-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Search employee</label>
              <input
                type="text"
                placeholder="Search by name, email, or department..."
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Select employee</label>
              <select
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                className="form-input"
              >
                <option value="">Select employee</option>
                {filteredEmployees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name}
                    {emp.department ? ` - ${emp.department}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Search skill</label>
              <input
                type="text"
                placeholder="Search by skill name, category, or description..."
                value={searchSkill}
                onChange={(e) => setSearchSkill(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Select skill</label>
              <select
                value={form.skillId}
                onChange={(e) => setForm({ ...form, skillId: e.target.value })}
                className="form-input"
              >
                <option value="">Select skill</option>
                {filteredSkills.map((skill) => (
                  <option key={skill._id} value={skill._id}>
                    {skill.name} - {skill.category}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Level</label>
              <select
                value={form.level}
                onChange={(e) =>
                  setForm({ ...form, level: e.target.value as SkillLevel })
                }
                className="form-input"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Dynamic score</label>
              <input
                type="number"
                min="0"
                placeholder="Enter dynamic score"
                value={form.dynamicScore}
                onChange={(e) =>
                  setForm({ ...form, dynamicScore: Number(e.target.value) })
                }
                className="form-input"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Assigning...' : 'Assign Skill'}
            </button>
          </div>
        </form>
      </div>

      {(error || success) && (
        <div className="content-card">
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      <div className="content-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Selected Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="cell-title">Employee</td>
                <td>
                  {employees.find((emp) => emp._id === form.employeeId)?.name || '—'}
                </td>
              </tr>
              <tr>
                <td className="cell-title">Skill</td>
                <td>
                  {skills.find((skill) => skill._id === form.skillId)?.name || '—'}
                </td>
              </tr>
              <tr>
                <td className="cell-title">Level</td>
                <td>
                  <span className={`badge badge-${form.level.toLowerCase()}`}>
                    {getLevelLabel(form.level)}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="cell-title">Dynamic Score</td>
                <td>{form.dynamicScore}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>
            Employees: {loading ? 'Loading...' : employees.length} | Skills:{' '}
            {loading ? 'Loading...' : skills.length}
          </span>
        </div>
      </div>
    </div>
  );
}