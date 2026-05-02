import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FiSearch, FiCheck, FiX, FiAlertCircle, FiInfo
} from 'react-icons/fi';
import {
  HiOutlineAcademicCap,
  HiOutlineBolt,
  HiOutlineBuildingOffice2,
  HiOutlineChartBar,
  HiOutlineSquares2X2,
  HiOutlineSparkles,
  HiOutlineUserCircle,
} from 'react-icons/hi2';
import {
  assignSkill,
  deleteEmployeeSkill,
  getAllSkills,
  getEmployeeSkills,
  updateEmployeeSkillLevel,
} from '../../../services/skills.service';
import { getUsers } from '../../../services/users.service';
import { getAllDepartments, type Department } from '../../../services/departments.service';
import { getAllDomains, type Domain } from '../../../services/domains.service';

// ─────────────────────────────────────────────────────────────
// 🎨 Theme & Design Tokens
// ─────────────────────────────────────────────────────────────
const theme = {
  colors: {
    primary: '#6366f1',
    primaryLight: '#818cf8',
    primaryBg: '#eef2ff',
    success: 'var(--primary)',
    successBg: '#ecfdf5',
    warning: '#f59e0b',
    danger: '#ef4444',
    dangerBg: '#fef2f2',
    muted: 'var(--muted, #64748b)',
    text: 'var(--text, #0f172a)',
    textSecondary: 'var(--muted, #64748b)',
    bg: 'var(--bg, #f8fafc)',
    surface: 'var(--surface, #ffffff)',
    surface2: 'var(--surface-2, #eef2ff)',
    border: 'var(--border, #e2e8f0)',
    borderFocus: 'var(--border-focus, #6366f1)',
  },
  radius: { sm: '10px', md: '14px', lg: '18px' },
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.06)',
    md: '0 4px 12px rgba(0,0,0,0.08)',
    lg: '0 8px 24px rgba(0,0,0,0.12)',
  },
  font: {
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ─────────────────────────────────────────────────────────────
// 🧩 Types
// ─────────────────────────────────────────────────────────────
type Skill = {
  _id: string;
  name: string;
  category: 'KNOWLEDGE' | 'KNOW_HOW' | 'SOFT';
  description?: string;
  domainIds?: (string | Domain)[];
};

type Employee = {
  _id: string;
  name: string;
  email?: string;
  department?: string;
  departement_id?: string | { _id?: string; name?: string };
};

type SkillLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPERT';
type EmployeeAssignedSkill = {
  id: string;
  name: string;
  category: Skill['category'] | string;
  level: SkillLevel | string;
  dynamicScore?: number;
};

// ─────────────────────────────────────────────────────────────
// 🎨 Reusable UI Components
// ─────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 40 }: { name: string; size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: theme.colors.primaryBg, color: theme.colors.primary,
    display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: size * 0.4,
    border: '2px solid ' + theme.colors.surface,
    boxShadow: theme.shadow.sm,
  }}>
    {name?.charAt(0).toUpperCase() || '?'}
  </div>
);

const CategoryPill = ({ category }: { category: Skill['category'] }) => {
  const colors: Record<string, string> = {
    KNOWLEDGE: '#dbeafe', KNOW_HOW: '#dcfce7', SOFT: '#fef3c7'
  };
  const textColors: Record<string, string> = {
    KNOWLEDGE: '#1e40af', KNOW_HOW: '#166534', SOFT: '#92400e'
  };
  return (
    <span style={{
      padding: '6px 10px', borderRadius: '8px', fontSize: '12px',
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
      background: colors[category] || '#f1f5f9',
      color: textColors[category] || '#475569',
    }}>
      {category.replace('_', ' ')}
    </span>
  );
};

const SearchCombobox = ({ 
  placeholder, value, onChange, onSelect, options, loading, icon 
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (id: string) => void;
  options: { id: string; label: string; subtitle?: string; badge?: React.ReactNode }[];
  loading?: boolean;
  icon: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.max(1, Math.ceil(options.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visibleOptions = options.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [value, options.length]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: theme.colors.muted, pointerEvents: 'none' }}>
          {icon}
        </div>
        <input
          ref={(el) => { inputRef.current = el; }}
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '14px 16px 14px 44px',
            borderRadius: theme.radius.sm, border: '1px solid ' + theme.colors.border,
            background: theme.colors.surface, color: theme.colors.text,
            fontSize: '17px', outline: 'none', transition: theme.transition,
          }}
        />
        {value && (
          <button type="button" onClick={() => onChange('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.muted, padding: '4px' }}>
            <FiX size={14} />
          </button>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          maxHeight: '240px', overflowY: 'auto', background: theme.colors.surface,
          border: '1px solid ' + theme.colors.border, borderRadius: theme.radius.sm,
          boxShadow: theme.shadow.md, zIndex: 10, padding: '6px',
        }}>
          {loading ? (
            <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.muted, fontSize: '16px' }}>Loading...</div>
          ) : options.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.muted, fontSize: '16px' }}>No matches found</div>
          ) : (
            <>
              {visibleOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onSelect(opt.id); setOpen(false); }}
                  style={{
                    width: '100%', padding: '12px 14px', textAlign: 'left',
                    borderRadius: '8px', border: 'none', background: 'transparent',
                    color: theme.colors.text, cursor: 'pointer', fontSize: '16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: theme.transition,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.primaryBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>
                    <span style={{ fontWeight: 700 }}>{opt.label}</span>
                    {opt.subtitle && <span style={{ color: theme.colors.muted, marginLeft: '8px', fontSize: '13px' }}>{opt.subtitle}</span>}
                  </span>
                  {opt.badge}
                </button>
              ))}
              {options.length > ITEMS_PER_PAGE && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px 6px 4px' }}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    style={{
                      border: '1px solid ' + theme.colors.border,
                      background: theme.colors.surface,
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: theme.colors.text,
                      cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                      opacity: safePage === 1 ? 0.5 : 1,
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '12px', color: theme.colors.muted, fontWeight: 700 }}>
                    Page {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    style={{
                      border: '1px solid ' + theme.colors.border,
                      background: theme.colors.surface,
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: theme.colors.text,
                      cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: safePage === totalPages ? 0.5 : 1,
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const LevelSelector = ({ value, onChange }: { value: SkillLevel; onChange: (l: SkillLevel) => void }) => {
  const levels: { val: SkillLevel; label: string; color: string; desc: string }[] = [
    { val: 'LOW', label: 'Beginner', color: '#475569', desc: 'Basic awareness' },
    { val: 'MEDIUM', label: 'Intermediate', color: '#3b82f6', desc: 'Works independently' },
    { val: 'HIGH', label: 'Advanced', color: '#8b5cf6', desc: 'Can mentor others' },
    { val: 'EXPERT', label: 'Expert', color: '#ec4899', desc: 'Subject authority' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
      {levels.map((lvl) => {
        const active = value === lvl.val;
        return (
          <button
            key={lvl.val}
            type="button"
            onClick={() => onChange(lvl.val)}
            style={{
              padding: '16px 12px', borderRadius: theme.radius.sm,
              border: '2px solid ' + (active ? lvl.color : theme.colors.border),
              background: active ? lvl.color + '12' : theme.colors.surface,
              color: active ? 'color-mix(in srgb, var(--text) 82%, ' + lvl.color + ')' : 'var(--text)',
              fontWeight: 700, fontSize: '14px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              transition: theme.transition,
            }}
          >
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: lvl.color, opacity: active ? 1 : 0.3,
              display: 'grid', placeItems: 'center', color: 'white', fontWeight: 800, fontSize: '13px'
            }}>
              {lvl.val[0]}
            </div>
            {lvl.label}
          </button>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🚀 Main Component
// ─────────────────────────────────────────────────────────────
export default function AssignSkillPage() {
  const [searchParams] = useSearchParams();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [skillCategoryFilter, setSkillCategoryFilter] = useState<'' | Skill['category']>('');
  const [skillDomainFilter, setSkillDomainFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchSkill, setSearchSkill] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedEmployeeSkills, setSelectedEmployeeSkills] = useState<EmployeeAssignedSkill[]>([]);
  const [employeeSkillsLoading, setEmployeeSkillsLoading] = useState(false);
  const [employeeSkillsError, setEmployeeSkillsError] = useState('');
  const [editingEmployeeSkillId, setEditingEmployeeSkillId] = useState('');
  const [editingLevel, setEditingLevel] = useState<SkillLevel>('LOW');
  const [editingScore, setEditingScore] = useState<number>(0);
  const [savingEmployeeSkill, setSavingEmployeeSkill] = useState(false);

  const [form, setForm] = useState<{
    employeeId: string;
    skillId: string;
    level: SkillLevel;
    dynamicScore: number;
  }>({ employeeId: '', skillId: '', level: 'LOW', dynamicScore: 0 });

  useEffect(() => {
    const resolveDepartment = (user: Employee, map: Map<string, string>) => {
      const direct = String(user.department || '').trim();
      if (direct && map.has(direct)) return map.get(direct) || '';
      const depId = typeof user.departement_id === 'string' ? user.departement_id : user.departement_id?._id;
      if (depId && map.has(depId)) return map.get(depId) || '';
      if (direct && !/^[a-f\d]{24}$/i.test(direct)) return direct;
      return '';
    };

    const load = async () => {
      try {
        setLoading(true); setError('');
        const [sk, emp, dept, allDomains] = await Promise.all([
          getAllSkills(),
          getUsers(),
          getAllDepartments(),
          getAllDomains(),
        ]);
        setSkills(Array.isArray(sk) ? sk : []);
        setDomains(Array.isArray(allDomains) ? allDomains : []);
        const deptMap = new Map(Array.isArray(dept) ? dept.filter((d: Department) => d?._id && d?.name).map((d: Department) => [String(d._id), String(d.name)]) : []);
        setEmployees((Array.isArray(emp) ? emp : []).filter((u: any) => u?.role === 'EMPLOYEE').map((u: any) => ({
          ...u, department: resolveDepartment(u, deptMap)
        })));
      } catch (e) {
        console.error(e);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredSkills = useMemo(() => {
    const q = searchSkill.trim().toLowerCase();
    return skills.filter((s) => {
      const matchesCategory = !skillCategoryFilter || s.category === skillCategoryFilter;
      const skillDomainIds = (s.domainIds || []).map((entry) =>
        typeof entry === 'string' ? entry : String(entry?._id || ''),
      );
      const matchesDomain = !skillDomainFilter || skillDomainIds.includes(skillDomainFilter);
      if (!matchesCategory || !matchesDomain) return false;
      if (!q) return true;
      const domainLabel = String(
        (s.domainIds || [])
          .map((entry) => (typeof entry === 'string' ? entry : entry?.name || ''))
          .join(' '),
      ).toLowerCase();
      return (
        (s.name || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        domainLabel.includes(q)
      );
    });
  }, [skills, searchSkill, skillCategoryFilter, skillDomainFilter]);

  const selectedEmployee = employees.find(e => e._id === form.employeeId);
  const selectedSkill = skills.find(s => s._id === form.skillId);
  const isValid = form.employeeId && form.skillId && form.dynamicScore >= 0;

  useEffect(() => {
    const preselectedEmployeeId = String(searchParams.get('employeeId') || '').trim();
    if (!preselectedEmployeeId || employees.length === 0) return;
    if (!employees.some((e) => e._id === preselectedEmployeeId)) return;

    setForm((prev) => (prev.employeeId === preselectedEmployeeId ? prev : { ...prev, employeeId: preselectedEmployeeId }));
  }, [searchParams, employees]);

  const refreshEmployeeSkills = async (employeeId: string) => {
    setEmployeeSkillsLoading(true);
    setEmployeeSkillsError('');
    try {
      const rows = await getEmployeeSkills(employeeId);
      const mapped = (Array.isArray(rows) ? rows : []).map((row: any) => ({
        id: String(row?._id || ''),
        name: String(row?.skill?.name || 'Unknown skill'),
        category: String(row?.skill?.category || '-'),
        level: String(row?.level || '-'),
        dynamicScore: typeof row?.dynamicScore === 'number' ? row.dynamicScore : undefined,
      }));
      setSelectedEmployeeSkills(mapped);
    } catch (e: any) {
      setSelectedEmployeeSkills([]);
      setEmployeeSkillsError(String(e?.message || 'Failed to load employee skills.'));
    } finally {
      setEmployeeSkillsLoading(false);
    }
  };

  useEffect(() => {
    if (!form.employeeId) {
      setSelectedEmployeeSkills([]);
      setEmployeeSkillsLoading(false);
      setEmployeeSkillsError('');
      return;
    }
    void refreshEmployeeSkills(form.employeeId);
  }, [form.employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) { setError('Please complete all required fields.'); return; }
    try {
      setSubmitting(true); setError(''); setSuccess('');
      await assignSkill(form as any);
      await refreshEmployeeSkills(form.employeeId);
      setForm((prev) => ({ ...prev, skillId: '', level: 'LOW', dynamicScore: 0 }));
      setSuccess('Skill assigned successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      const apiMessage = String(err?.response?.data?.message || '').toLowerCase();
      if (apiMessage.includes('already assigned')) {
        setError('The employee has already that skill.');
      } else {
        setError('Failed to assign skill.');
      }
    } finally { setSubmitting(false); }
  };

  const startEditEmployeeSkill = (skill: EmployeeAssignedSkill) => {
    setEditingEmployeeSkillId(skill.id);
    setEditingLevel((String(skill.level || 'LOW').toUpperCase() as SkillLevel) || 'LOW');
    setEditingScore(Number(skill.dynamicScore ?? 0));
    setError('');
  };

  const cancelEditEmployeeSkill = () => {
    setEditingEmployeeSkillId('');
  };

  const saveEmployeeSkillChanges = async (skill: EmployeeAssignedSkill) => {
    if (!form.employeeId) return;
    try {
      setSavingEmployeeSkill(true);
      setError('');
      const currentScore = Number(skill.dynamicScore ?? 0);
      const nextScore = Number(editingScore);
      const scoreDelta = Number.isFinite(nextScore) ? nextScore - currentScore : 0;
      await updateEmployeeSkillLevel(skill.id, {
        newLevel: editingLevel,
        scoreDelta,
      });
      await refreshEmployeeSkills(form.employeeId);
      setEditingEmployeeSkillId('');
      setSuccess('Skill updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(String(e?.response?.data?.message || e?.message || 'Failed to update skill.'));
    } finally {
      setSavingEmployeeSkill(false);
    }
  };

  const handleDeleteEmployeeSkill = async (skill: EmployeeAssignedSkill) => {
    if (!form.employeeId) return;
    const ok = window.confirm(`Remove "${skill.name}" from this employee?`);
    if (!ok) return;
    try {
      setSavingEmployeeSkill(true);
      setError('');
      await deleteEmployeeSkill(skill.id);
      await refreshEmployeeSkills(form.employeeId);
      setSuccess('Skill removed successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(String(e?.response?.data?.message || e?.message || 'Failed to delete skill.'));
    } finally {
      setSavingEmployeeSkill(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 🖼️ Render
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: theme.colors.bg, color: theme.colors.text, fontFamily: theme.font.body, padding: '40px 30px' }}>
      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        
        {/* Header */}
        <div className="page-header" style={{ marginBottom: '36px' }}>
          <div>
            <h1 className="page-title">Skill Assignment</h1>
            <p className="page-subtitle" style={{ color: 'color-mix(in srgb, var(--text) 72%, var(--muted))' }}>
              Match competencies with precision and context.
            </p>
          </div>
        </div>

        {/* Alerts */}
        {(error || success) && (
          <div style={{
            marginBottom: '24px', padding: '16px 20px', borderRadius: theme.radius.sm,
            display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 600,
            background: error ? theme.colors.dangerBg : theme.colors.successBg,
            border: '1px solid ' + (error ? '#fecaca' : '#bbf7d0'),
            color: error ? theme.colors.danger : theme.colors.success,
          }}>
            {error ? <FiAlertCircle size={20} /> : <FiCheck size={20} />}
            <span style={{ flex: 1 }}>{error || success}</span>
            <button type="button" onClick={() => { setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
              <FiX size={18} />
            </button>
          </div>
        )}

        {/* Main Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px' }}>
          
          {/* Form Section */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Skill */}
            <div style={{ padding: '32px', background: theme.colors.surface, borderRadius: theme.radius.lg, border: '1px solid ' + theme.colors.border, boxShadow: theme.shadow.sm }}>
              <div style={{ fontWeight: 700, fontSize: '23px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: theme.colors.primaryBg, color: theme.colors.primary, display: 'inline-grid', placeItems: 'center' }}>
                  <HiOutlineAcademicCap size={20} />
                </span>
                Select Skill
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 0.7fr 1.3fr', gap: '12px' }}>
                <select
                  value={skillCategoryFilter}
                  onChange={(e) => setSkillCategoryFilter(e.target.value as '' | Skill['category'])}
                  aria-label="Filter skills by category"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: theme.radius.sm,
                    border: '1px solid ' + theme.colors.border,
                    background: theme.colors.surface,
                    color: theme.colors.text,
                    fontSize: '16px',
                    fontWeight: 600,
                    outline: 'none',
                    transition: theme.transition,
                  }}
                >
                  <option value="">All Categories</option>
                  <option value="KNOWLEDGE">Knowledge</option>
                  <option value="KNOW_HOW">Know-how</option>
                  <option value="SOFT">Soft skill</option>
                </select>

                <select
                  value={skillDomainFilter}
                  onChange={(e) => setSkillDomainFilter(e.target.value)}
                  aria-label="Filter skills by domain"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: theme.radius.sm,
                    border: '1px solid ' + theme.colors.border,
                    background: theme.colors.surface,
                    color: theme.colors.text,
                    fontSize: '16px',
                    fontWeight: 600,
                    outline: 'none',
                    transition: theme.transition,
                  }}
                >
                  <option value="">All Domains</option>
                  {domains.map((domain) => (
                    <option key={domain._id} value={domain._id}>
                      {domain.name}
                    </option>
                  ))}
                </select>

                <SearchCombobox
                  placeholder="Search by skill name or category..."
                  value={searchSkill}
                  onChange={setSearchSkill}
                  onSelect={(id) => { setForm(f => ({ ...f, skillId: id })); setSearchSkill(''); }}
                  loading={loading}
                  icon={<FiSearch size={16} />}
                  options={filteredSkills.map(s => ({
                    id: s._id,
                    label: s.name,
                    subtitle: s.description?.slice(0, 40),
                    badge: <CategoryPill category={s.category} />
                  }))}
                />

              </div>
            </div>

            {/* Level & Score */}
            <div style={{ padding: '32px', background: theme.colors.surface, borderRadius: theme.radius.lg, border: '1px solid ' + theme.colors.border, boxShadow: theme.shadow.sm }}>
              <div style={{ fontWeight: 700, fontSize: '23px', marginBottom: '20px' }}>Proficiency & Priority</div>
              <div style={{ marginBottom: '22px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'color-mix(in srgb, var(--text) 70%, var(--muted))', marginBottom: '10px' }}>Target Level</div>
                <LevelSelector value={form.level} onChange={(l) => setForm(f => ({ ...f, level: l }))} />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'color-mix(in srgb, var(--text) 70%, var(--muted))', marginBottom: '10px' }}>Dynamic Score (0-100)</div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.dynamicScore}
                  aria-label="Dynamic score from zero to one hundred"
                  onChange={(e) => setForm(f => ({ ...f, dynamicScore: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: theme.radius.sm,
                    border: '1px solid ' + theme.colors.border, background: theme.colors.surface,
                    color: theme.colors.text, fontSize: '18px', fontWeight: 700, outline: 'none',
                    transition: theme.transition,
                  }}
                  onFocus={(e) => e.target.style.borderColor = theme.colors.borderFocus}
                  onBlur={(e) => e.target.style.borderColor = theme.colors.border}
                />
                <div style={{ fontSize: '15px', color: theme.colors.muted, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiInfo size={14} /> Optional numeric weight for this assignment (0–100).
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid || submitting}
              style={{
                width: '100%', padding: '20px', borderRadius: theme.radius.md,
                background: isValid ? theme.colors.primary : theme.colors.border,
                color: 'white', fontWeight: 800, fontSize: '20px', border: 'none',
                cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: theme.transition,
                boxShadow: isValid ? '0 4px 14px rgba(99, 102, 241, 0.3)' : 'none',
              }}
            >
              {submitting ? (
                <>
                  <div style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Assigning...
                </>
              ) : 'Assign Skill'}
            </button>

            {/* Existing Employee Skills */}
            <div style={{ padding: '32px', background: theme.colors.surface, borderRadius: theme.radius.lg, border: '1px solid ' + theme.colors.border, boxShadow: theme.shadow.sm }}>
              <div style={{ fontWeight: 700, fontSize: '27px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: theme.colors.primaryBg, color: theme.colors.primary, display: 'inline-grid', placeItems: 'center' }}>
                  <HiOutlineAcademicCap size={20} />
                </span>
                Existing Skills
              </div>
              <div style={{ padding: '14px', borderRadius: theme.radius.sm, background: theme.colors.surface, border: '1px solid ' + theme.colors.border }}>
                {employeeSkillsLoading ? (
                  <div style={{ color: theme.colors.muted, fontSize: '17px', fontStyle: 'italic' }}>Loading employee skills...</div>
                ) : employeeSkillsError ? (
                  <div style={{ color: theme.colors.danger, fontSize: '17px', fontWeight: 700 }}>{employeeSkillsError}</div>
                ) : selectedEmployeeSkills.length === 0 ? (
                  <div style={{ color: theme.colors.muted, fontSize: '17px', fontStyle: 'italic' }}>No skills assigned yet</div>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {selectedEmployeeSkills.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          fontSize: '15px',
                          fontWeight: 700,
                          background: '#f3f4f6',
                          border: '1px solid #e5e7eb',
                          color: theme.colors.text,
                          display: 'grid',
                          gap: '8px',
                        }}
                        title={typeof s.dynamicScore === 'number' ? `Score: ${s.dynamicScore}` : undefined}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span>
                            {s.name} - {String(s.level || '-')}
                            {typeof s.dynamicScore === 'number' ? ` (${s.dynamicScore}/100)` : ''}
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => startEditEmployeeSkill(s)}
                              disabled={savingEmployeeSkill}
                              style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '8px', padding: '6px 10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteEmployeeSkill(s)}
                              disabled={savingEmployeeSkill}
                              style={{ border: '1px solid #fecaca', background: '#fff1f2', color: '#b91c1c', borderRadius: '8px', padding: '6px 10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {editingEmployeeSkillId === s.id ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '6px', alignItems: 'center' }}>
                            <select
                              value={editingLevel}
                              onChange={(e) => setEditingLevel(e.target.value as SkillLevel)}
                              style={{ height: '36px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 8px', fontSize: '13px', fontWeight: 700 }}
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="EXPERT">Expert</option>
                            </select>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={editingScore}
                              onChange={(e) => setEditingScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                              style={{ height: '36px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 8px', fontSize: '13px', fontWeight: 700 }}
                              placeholder="Score"
                            />
                            <button
                              type="button"
                              onClick={() => void saveEmployeeSkillChanges(s)}
                              disabled={savingEmployeeSkill}
                              style={{ border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', padding: '6px 10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditEmployeeSkill}
                              disabled={savingEmployeeSkill}
                              style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '8px', padding: '6px 10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Live Preview */}
          <div style={{ position: 'sticky', top: '40px', height: 'fit-content' }}>
            <div style={{
              padding: '34px', borderRadius: theme.radius.lg,
              background: 'linear-gradient(145deg, ' + theme.colors.surface + ' 0%, ' + theme.colors.surface2 + ' 100%)',
              border: '1px solid ' + theme.colors.border, boxShadow: theme.shadow.md,
            }}>
              <div style={{ fontWeight: 800, fontSize: '26px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fef3c7', color: theme.colors.warning, display: 'inline-grid', placeItems: 'center' }}>
                  <HiOutlineSparkles size={20} />
                </span>
                Assignment Preview
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Employee Preview */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: theme.colors.text, opacity: 0.8, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <HiOutlineUserCircle size={14} /> Employee
                  </div>
                  {selectedEmployee ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar name={selectedEmployee.name} size={52} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '19px' }}>{selectedEmployee.name}</div>
                        <div style={{ fontSize: '15px', color: theme.colors.muted }}>
                          {selectedEmployee.email || 'No email'}
                          {selectedEmployee.department && (
                            <div style={{ marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <HiOutlineBuildingOffice2 size={14} /> {selectedEmployee.department}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '16px', color: theme.colors.muted, fontStyle: 'italic' }}>Select an employee</div>
                  )}
                </div>

                {/* Skill Preview */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: theme.colors.text, opacity: 0.8, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <HiOutlineAcademicCap size={14} /> Skill
                  </div>
                  {selectedSkill ? (
                    <div style={{ padding: '16px', borderRadius: theme.radius.sm, background: theme.colors.surface, border: '1px solid ' + theme.colors.border }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '19px' }}>{selectedSkill.name}</span>
                        <CategoryPill category={selectedSkill.category} />
                      </div>
                      {selectedSkill.description && <div style={{ fontSize: '15px', color: theme.colors.textSecondary, lineHeight: 1.4 }}>{selectedSkill.description}</div>}
                      {!!selectedSkill.domainIds?.length && (
                        <div
                          style={{
                            marginTop: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <HiOutlineSquares2X2 size={14} color={theme.colors.muted} />
                          {(selectedSkill.domainIds || []).map((entry) => (
                            <span
                              key={typeof entry === 'string' ? entry : entry._id}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                              }}
                            >
                              {typeof entry === 'string'
                                ? domains.find((domain) => domain._id === entry)?.name || entry
                                : entry.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '16px', color: theme.colors.muted, fontStyle: 'italic' }}>Select a skill</div>
                  )}
                </div>

                {/* Level & Score Preview */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: theme.colors.text, opacity: 0.8, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <HiOutlineChartBar size={14} /> Level
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '10px',
                        background: ({ LOW: '#94a3b8', MEDIUM: '#3b82f6', HIGH: '#8b5cf6', EXPERT: '#ec4899' }[form.level]) + '20',
                        color: ({ LOW: '#94a3b8', MEDIUM: '#3b82f6', HIGH: '#8b5cf6', EXPERT: '#ec4899' }[form.level]),
                        display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '16px'
                      }}>{form.level[0]}</div>
                      <div style={{ fontWeight: 700, fontSize: '17px' }}>
                        {{ LOW: 'Beginner', MEDIUM: 'Intermediate', HIGH: 'Advanced', EXPERT: 'Expert' }[form.level]}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: theme.colors.text, opacity: 0.8, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <HiOutlineBolt size={14} /> Score
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '32px', color: theme.colors.warning }}>
                      {form.dynamicScore}<span style={{ fontSize: '18px', color: theme.colors.muted }}>/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {isValid && (
                <div style={{
                  marginTop: '24px', padding: '14px', borderRadius: theme.radius.sm,
                  background: theme.colors.successBg, border: '1px solid ' + theme.colors.success,
                  color: theme.colors.success, fontWeight: 800, textAlign: 'center', fontSize: '17px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                  <FiCheck size={18} /> Ready to submit
                </div>
              )}
            </div>

            {/* Stats Footer */}
            <div style={{
              marginTop: '16px', padding: '22px', borderRadius: theme.radius.md,
              background: theme.colors.surface, border: '1px solid ' + theme.colors.border,
              display: 'flex', justifyContent: 'space-around', textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: theme.colors.primary }}>
                  {loading ? '...' : employees.length}
                </div>
                <div style={{ fontSize: '15px', color: theme.colors.muted }}>Employees</div>
              </div>
              <div style={{ borderLeft: '1px solid ' + theme.colors.border, paddingLeft: '24px' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: theme.colors.primary }}>
                  {loading ? '...' : skills.length}
                </div>
                <div style={{ fontSize: '15px', color: theme.colors.muted }}>Skills</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 960px) {
          .grid-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}