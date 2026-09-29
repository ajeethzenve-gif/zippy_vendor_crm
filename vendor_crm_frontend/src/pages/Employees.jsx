import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getEmployees, getEmployeeRoles, createEmployee } from "../services/api";
import "../styles/Employees.css";

const emptyForm = {
  first_name: "", last_name: "", email: "", phone_number: "", username: "", password: "", role: "",
  joining_date: "", date_of_birth: "", gender: "", address: "", city: "", state: "", country: "India", postal_code: "",
};

export default function Employees() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({ ...emptyForm });
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (currentUser?.id !== "admin") return;
    let cancelled = false;
    Promise.all([getEmployees(), getEmployeeRoles()])
      .then(([people, availableRoles]) => {
        if (!cancelled) { setEmployees(people); setRoles(availableRoles); }
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.id !== "admin") return <Navigate to={currentUser.landingPath || "/"} replace />;

  function change(event) {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
    setFieldErrors(previous => ({ ...previous, [name]: undefined }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setError(""); setSuccess(""); setFieldErrors({});
    const payload = { ...form, joining_date: form.joining_date || null, date_of_birth: form.date_of_birth || null };
    try {
      const employee = await createEmployee(payload);
      setEmployees(previous => [employee, ...previous]);
      setSuccess(`${employee.first_name} ${employee.last_name || ""} created. Employee ID: ${employee.employee_id}. Username: ${employee.username}. Role: ${employee.role}.`);
      setForm({ ...emptyForm }); setShowPassword(false);
    } catch (err) {
      setError(err.message); setFieldErrors(err.fields || {});
    } finally { setSaving(false); }
  }

  function field(name, label, { type = "text", required = false, maxLength = 150, autoComplete = "off" } = {}) {
    return <label className="employee-field" key={name} htmlFor={`employee-${name}`}>
      <span>{label}{required ? " *" : ""}</span>
      <input id={`employee-${name}`} name={name} type={type} required={required} maxLength={maxLength}
        autoComplete={autoComplete} value={form[name]} onChange={change}
        aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `error-${name}` : undefined} />
      {fieldErrors[name] && <small id={`error-${name}`} className="employee-error">{[].concat(fieldErrors[name]).join(" ")}</small>}
    </label>;
  }

  return <main className="employees-page">
    <header className="employees-header"><div><Link to="/command-centre">← Command Centre</Link><h1>Employees</h1><p>Create an employee account and assign their workspace role.</p></div><span>Administrator</span></header>
    {error && <p className="employee-alert employee-error" role="alert">{error}</p>}
    {success && <p className="employee-alert employee-success" role="status">{success}</p>}
    <section className="employees-card">
      <h2>Add employee</h2><p>Fields marked * are required. Employee ID is generated automatically.</p>
      <form onSubmit={submit}>
        <fieldset disabled={saving || loading}><legend>Employee details</legend>
          <div className="employee-grid">
            {field("first_name", "First name", { required: true })}{field("last_name", "Last name")}
            {field("email", "Email", { type: "email", required: true, maxLength: 254 })}
            {field("phone_number", "Phone number", { type: "tel", required: true, maxLength: 15 })}
            {field("joining_date", "Joining date", { type: "date" })}
            {field("date_of_birth", "Date of birth", { type: "date" })}
            <label className="employee-field">Gender<select name="gender" value={form.gender} onChange={change}><option value="">Not specified</option><option>Female</option><option>Male</option><option>Other</option></select></label>
            {field("city", "City", { maxLength: 100 })}{field("state", "State", { maxLength: 100 })}
            {field("country", "Country", { maxLength: 100 })}{field("postal_code", "Postal code", { maxLength: 10 })}
            <label className="employee-field">Address<textarea name="address" value={form.address} onChange={change} rows="2" /></label>
          </div>
        </fieldset>
        <fieldset disabled={saving || loading}><legend>Login and role</legend><div className="employee-grid">
          {field("username", "Username", { required: true, autoComplete: "off" })}
          <label className="employee-field" htmlFor="employee-role"><span>Role *</span><select id="employee-role" name="role" value={form.role} onChange={change} required><option value="">Select a role</option>{roles.map(role => <option key={role.name} value={role.name}>{role.name}</option>)}</select>{fieldErrors.role && <small className="employee-error">{[].concat(fieldErrors.role).join(" ")}</small>}</label>
          {field("password", "Password", { type: showPassword ? "text" : "password", required: true, maxLength: 128, autoComplete: "new-password" })}
        </div><label className="employee-show-password"><input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} /> Show password</label>
          <p className="employee-help">Use a strong password with at least 8 characters. Share it privately with the employee. Passwords cannot be viewed after saving.</p>
        </fieldset>
        <button className="employee-submit" disabled={saving || loading || !roles.length} type="submit">{saving ? "Creating employee…" : "Create employee"}</button>
      </form>
    </section>
    <section className="employees-card"><h2>Employee directory <span>({employees.length})</span></h2>
      {loading ? <p role="status">Loading employees…</p> : employees.length === 0 ? <p>No employees yet. Add your first employee above.</p> : <div className="employee-table-wrap"><table><thead><tr><th>Employee ID</th><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th></tr></thead><tbody>{employees.map(employee => <tr key={employee.id}><td>{employee.employee_id}</td><td>{employee.first_name} {employee.last_name}</td><td>{employee.username}</td><td>{employee.email}</td><td>{employee.phone_number}</td><td>{employee.role}</td><td>{employee.is_active ? "Active" : "Inactive"}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
