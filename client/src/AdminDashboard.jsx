import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "student",
    branch: "",
    section: "",
  });

  // =====================================================
  // USER
  // =====================================================

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (err) {
      console.error("USER LOAD ERROR:", err);
    }
  }, []);

  // =====================================================
  // HELPERS
  // =====================================================

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  });

  const showMessage = (text) => {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 3500);
  };

  const getId = (value) => {
    if (!value) return "";

    if (typeof value === "string") return value;

    return value._id || value.id || "";
  };

  // =====================================================
  // LOAD USERS
  // =====================================================

  const loadUsers = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(`${API}/admin/users`, {
        method: "GET",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load users"
        );
      }

      let records = [];

      if (Array.isArray(data)) {
        records = data;
      } else if (Array.isArray(data.users)) {
        records = data.users;
      } else if (Array.isArray(data.data)) {
        records = data.data;
      } else if (Array.isArray(data.students)) {
        records = data.students;
      }

      setUsers(records);
    } catch (err) {
      console.error("LOAD USERS ERROR:", err);

      setError(err.message || "Failed to load users");

      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // =====================================================
  // FILTERED USERS
  // =====================================================

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const text = `
        ${item.name || ""}
        ${item.email || ""}
        ${item.branch || ""}
        ${item.section || ""}
        ${item.role || ""}
      `.toLowerCase();

      const matchesSearch =
        text.includes(search.toLowerCase());

      const matchesRole =
        roleFilter === "ALL" ||
        String(item.role || "").toLowerCase() ===
          roleFilter.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // =====================================================
  // STATS
  // =====================================================

  const stats = useMemo(() => {
    const students = users.filter(
      (item) =>
        String(item.role || "").toLowerCase() ===
        "student"
    );

    const mentors = users.filter((item) => {
      const role = String(item.role || "").toLowerCase();

      return (
        role === "mentor" ||
        role === "teacher" ||
        role === "faculty"
      );
    });

    const admins = users.filter(
      (item) =>
        String(item.role || "").toLowerCase() ===
        "admin"
    );

    return {
      total: users.length,
      students: students.length,
      mentors: mentors.length,
      admins: admins.length,
    };
  }, [users]);

  // =====================================================
  // FORM
  // =====================================================

  const handleInput = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // EDIT
  // =====================================================

  const startEdit = (item) => {
    setEditingUser(item);

    setForm({
      name: item.name || "",
      email: item.email || "",
      role: item.role || "student",
      branch: item.branch || "",
      section: item.section || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);

    setForm({
      name: "",
      email: "",
      role: "student",
      branch: "",
      section: "",
    });
  };

  // =====================================================
  // UPDATE USER
  // =====================================================

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingUser) return;

    if (!form.name.trim()) {
      showMessage("Student name is required ❌");
      return;
    }

    try {
      const id = getId(editingUser);

      const response = await fetch(
        `${API}/admin/users/${id}`,
        {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({
            name: form.name.trim(),
            branch: form.branch.trim(),
            section: form.section.trim(),
            role: form.role,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update user"
        );
      }

      showMessage(
        "User updated successfully ✅"
      );

      cancelEdit();

      await loadUsers(true);
    } catch (err) {
      console.error("UPDATE USER ERROR:", err);

      showMessage(
        `${err.message || "Update failed"} ❌`
      );
    }
  };

  // =====================================================
  // DELETE USER
  // =====================================================

  const handleDelete = async (item) => {
    const id = getId(item);

    if (!id) {
      showMessage("Invalid user ID ❌");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${
        item.name || "this user"
      }?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API}/admin/users/${id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete user"
        );
      }

      showMessage(
        "User deleted successfully 🗑️"
      );

      await loadUsers(true);
    } catch (err) {
      console.error("DELETE USER ERROR:", err);

      showMessage(
        `${err.message || "Delete failed"} ❌`
      );
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/";
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingOrb}>
          🎓
        </div>

        <h1 style={styles.loadingTitle}>
          EduBridge
        </h1>

        <div style={styles.loader} />

        <p>
          Loading Admin Dashboard...
        </p>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.container}>
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <header style={styles.header}>
          <div>
            <div style={styles.brand}>
              🎓 EDUBRIDGE
            </div>

            <h1 style={styles.title}>
              Admin Dashboard
            </h1>

            <p style={styles.subtitle}>
              Welcome back,{" "}
              <strong>
                {user?.name || "Admin"}
              </strong>{" "}
              👋
            </p>
          </div>

          <div style={styles.headerButtons}>
            <button
              style={styles.refreshButton}
              onClick={() => loadUsers(true)}
              disabled={refreshing}
            >
              {refreshing
                ? "⏳ Refreshing..."
                : "🔄 Refresh"}
            </button>

            <button
              style={styles.logoutButton}
              onClick={handleLogout}
            >
              🚪 Logout
            </button>
          </div>
        </header>

        {/* ================================================= */}
        {/* MESSAGE */}
        {/* ================================================= */}

        {message && (
          <div style={styles.message}>
            ✨ {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {/* ================================================= */}
        {/* STATS */}
        {/* ================================================= */}

        <div style={styles.statsGrid}>
          <StatCard
            icon="👥"
            title="Total Users"
            value={stats.total}
            tone="purple"
          />

          <StatCard
            icon="🎓"
            title="Students"
            value={stats.students}
            tone="blue"
          />

          <StatCard
            icon="👨‍🏫"
            title="Mentors"
            value={stats.mentors}
            tone="green"
          />

          <StatCard
            icon="🛡️"
            title="Admins"
            value={stats.admins}
            tone="orange"
          />
        </div>

        {/* ================================================= */}
        {/* EDIT PANEL */}
        {/* ================================================= */}

        {editingUser && (
          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  ✏️ Edit User
                </h2>

                <p style={styles.sectionSubtitle}>
                  Update student / mentor details
                </p>
              </div>
            </div>

            <form
              onSubmit={handleUpdate}
              style={styles.formGrid}
            >
              <Field label="Name">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleInput}
                  placeholder="Student name"
                  style={styles.input}
                />
              </Field>

              <Field label="Email">
                <input
                  name="email"
                  value={form.email}
                  disabled
                  style={{
                    ...styles.input,
                    background: "#f1f5f9",
                  }}
                />
              </Field>

              <Field label="Role">
                <select
                  name="role"
                  value={form.role}
                  onChange={handleInput}
                  style={styles.input}
                >
                  <option value="student">
                    Student
                  </option>

                  <option value="mentor">
                    Mentor
                  </option>

                  <option value="admin">
                    Admin
                  </option>
                </select>
              </Field>

              <Field label="Branch">
                <input
                  name="branch"
                  value={form.branch}
                  onChange={handleInput}
                  placeholder="CSE"
                  style={styles.input}
                />
              </Field>

              <Field label="Section">
                <input
                  name="section"
                  value={form.section}
                  onChange={handleInput}
                  placeholder="CSE-A"
                  style={styles.input}
                />
              </Field>

              <div style={styles.formButtons}>
                <button
                  type="submit"
                  style={styles.primaryButton}
                >
                  💾 Save Changes
                </button>

                <button
                  type="button"
                  onClick={cancelEdit}
                  style={styles.secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ================================================= */}
        {/* USER MANAGEMENT */}
        {/* ================================================= */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                👥 User Management
              </h2>

              <p style={styles.sectionSubtitle}>
                Manage EduBridge users
              </p>
            </div>

            <div style={styles.userCount}>
              {filteredUsers.length} users
            </div>
          </div>

          {/* SEARCH */}

          <div style={styles.filterBar}>
            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="🔍 Search name, email, branch..."
              style={styles.searchInput}
            />

            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value)
              }
              style={styles.filterSelect}
            >
              <option value="ALL">
                All Roles
              </option>

              <option value="student">
                Students
              </option>

              <option value="mentor">
                Mentors
              </option>

              <option value="admin">
                Admins
              </option>
            </select>
          </div>

          {/* TABLE */}

          {filteredUsers.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                📭
              </div>

              <h3>No users found</h3>

              <p>
                Try changing your search or filter.
              </p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>
                      User
                    </th>

                    <th style={styles.th}>
                      Role
                    </th>

                    <th style={styles.th}>
                      Branch
                    </th>

                    <th style={styles.th}>
                      Section
                    </th>

                    <th style={styles.th}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map(
                    (item, index) => {
                      const id = getId(item);

                      const role =
                        String(
                          item.role || "student"
                        ).toLowerCase();

                      return (
                        <tr
                          key={
                            id ||
                            `user-${index}`
                          }
                          style={styles.tr}
                        >
                          <td style={styles.td}>
                            <div
                              style={
                                styles.userCell
                              }
                            >
                              <div
                                style={
                                  styles.avatar
                                }
                              >
                                {role ===
                                "student"
                                  ? "🎓"
                                  : role ===
                                    "admin"
                                  ? "🛡️"
                                  : "👨‍🏫"}
                              </div>

                              <div>
                                <strong>
                                  {item.name ||
                                    "Unnamed User"}
                                </strong>

                                <small
                                  style={
                                    styles.email
                                  }
                                >
                                  {item.email ||
                                    "-"}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.roleBadge,
                                ...(role ===
                                "student"
                                  ? styles.studentRole
                                  : role ===
                                    "admin"
                                  ? styles.adminRole
                                  : styles.mentorRole),
                              }}
                            >
                              {role}
                            </span>
                          </td>

                          <td style={styles.td}>
                            {item.branch ||
                              "-"}
                          </td>

                          <td style={styles.td}>
                            {item.section ||
                              "-"}
                          </td>

                          <td style={styles.td}>
                            <div
                              style={
                                styles.actionButtons
                              }
                            >
                              <button
                                onClick={() =>
                                  startEdit(item)
                                }
                                style={
                                  styles.editButton
                                }
                              >
                                ✏️ Edit
                              </button>

                              <button
                                onClick={() =>
                                  handleDelete(
                                    item
                                  )
                                }
                                style={
                                  styles.deleteButton
                                }
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* QUICK INFORMATION */}
        {/* ================================================= */}

        <section style={styles.infoGrid}>
          <InfoCard
            icon="📚"
            title="Academic Management"
            text="Manage students, mentors, branches and sections from one place."
          />

          <InfoCard
            icon="📅"
            title="Attendance"
            text="Mentors can maintain attendance and students can view their records."
          />

          <InfoCard
            icon="💰"
            title="Fee Management"
            text="Track total fees, paid amounts and pending balances."
          />

          <InfoCard
            icon="🎉"
            title="Holidays & Timetable"
            text="Keep class schedules and holiday information organized."
          />
        </section>

        <footer style={styles.footer}>
          <span>
            🎓 EduBridge Admin Panel
          </span>

          <span>
            Academic Management System
          </span>
        </footer>
      </div>
    </div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  icon,
  title,
  value,
  tone,
}) {
  const toneStyle =
    styles[`tone_${tone}`] ||
    styles.tone_purple;

  return (
    <div
      style={{
        ...styles.statCard,
        ...toneStyle,
      }}
    >
      <div style={styles.statIcon}>
        {icon}
      </div>

      <div>
        <p style={styles.statTitle}>
          {title}
        </p>

        <h2 style={styles.statValue}>
          {value}
        </h2>
      </div>
    </div>
  );
}

// =====================================================
// FIELD
// =====================================================

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>
        {label}
      </span>

      {children}
    </label>
  );
}

// =====================================================
// INFO CARD
// =====================================================

function InfoCard({
  icon,
  title,
  text,
}) {
  return (
    <div style={styles.infoCard}>
      <div style={styles.infoIcon}>
        {icon}
      </div>

      <div>
        <h3 style={styles.infoTitle}>
          {title}
        </h3>

        <p style={styles.infoText}>
          {text}
        </p>
      </div>
    </div>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eef2ff 0%,#f8fafc 45%,#ecfeff 100%)",
    padding: "30px 20px",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    color: "#0f172a",
    position: "relative",
    overflow: "hidden",
  },

  glowOne: {
    position: "fixed",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    background:
      "rgba(99,102,241,.12)",
    top: "-120px",
    right: "-100px",
    filter: "blur(20px)",
    pointerEvents: "none",
  },

  glowTwo: {
    position: "fixed",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background:
      "rgba(6,182,212,.10)",
    bottom: "-120px",
    left: "-100px",
    filter: "blur(20px)",
    pointerEvents: "none",
  },

  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    position: "relative",
    zIndex: 2,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "25px",
  },

  brand: {
    fontSize: "14px",
    fontWeight: "900",
    letterSpacing: "3px",
    color: "#4f46e5",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "38px",
    fontWeight: "900",
    letterSpacing: "-1px",
  },

  subtitle: {
    color: "#64748b",
    marginTop: "8px",
    marginBottom: 0,
    fontSize: "16px",
  },

  headerButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  refreshButton: {
    border: "none",
    borderRadius: "14px",
    padding: "13px 18px",
    background: "#ffffff",
    color: "#334155",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow:
      "0 8px 25px rgba(15,23,42,.08)",
  },

  logoutButton: {
    border: "none",
    borderRadius: "14px",
    padding: "13px 18px",
    background:
      "linear-gradient(135deg,#ef4444,#dc2626)",
    color: "white",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow:
      "0 8px 25px rgba(239,68,68,.22)",
  },

  message: {
    background: "#ecfdf5",
    color: "#047857",
    border: "1px solid #a7f3d0",
    borderRadius: "14px",
    padding: "14px 18px",
    marginBottom: "20px",
    fontWeight: "700",
    animation:
      "edubridgeFade .35s ease",
  },

  error: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: "14px",
    padding: "14px 18px",
    marginBottom: "20px",
    fontWeight: "700",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "16px",
    marginBottom: "22px",
  },

  statCard: {
    borderRadius: "22px",
    padding: "22px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#ffffff",
    boxShadow:
      "0 15px 40px rgba(15,23,42,.08)",
    border: "1px solid rgba(255,255,255,.8)",
    transition:
      "transform .2s ease, box-shadow .2s ease",
  },

  statIcon: {
    width: "55px",
    height: "55px",
    borderRadius: "17px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "27px",
    background: "rgba(255,255,255,.75)",
  },

  statTitle: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "700",
  },

  statValue: {
    margin: "4px 0 0",
    fontSize: "30px",
    fontWeight: "900",
  },

  tone_purple: {
    background:
      "linear-gradient(135deg,#eef2ff,#ffffff)",
  },

  tone_blue: {
    background:
      "linear-gradient(135deg,#eff6ff,#ffffff)",
  },

  tone_green: {
    background:
      "linear-gradient(135deg,#ecfdf5,#ffffff)",
  },

  tone_orange: {
    background:
      "linear-gradient(135deg,#fff7ed,#ffffff)",
  },

  card: {
    background:
      "rgba(255,255,255,.92)",
    borderRadius: "25px",
    padding: "25px",
    marginBottom: "22px",
    boxShadow:
      "0 15px 45px rgba(15,23,42,.08)",
    border:
      "1px solid rgba(226,232,240,.8)",
    backdropFilter: "blur(12px)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "23px",
    fontWeight: "900",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  userCount: {
    background: "#eef2ff",
    color: "#4338ca",
    borderRadius: "999px",
    padding: "8px 13px",
    fontWeight: "800",
    fontSize: "13px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "17px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#475569",
  },

  input: {
    width: "100%",
    border:
      "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "12px 13px",
    outline: "none",
    fontSize: "14px",
    background: "#ffffff",
    color: "#0f172a",
  },

  formButtons: {
    display: "flex",
    alignItems: "end",
    gap: "10px",
  },

  primaryButton: {
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    background:
      "linear-gradient(135deg,#4f46e5,#7c3aed)",
    color: "white",
    fontWeight: "800",
    cursor: "pointer",
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "#ffffff",
    color: "#475569",
    fontWeight: "800",
    cursor: "pointer",
  },

  filterBar: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  searchInput: {
    flex: 1,
    minWidth: "250px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "13px",
    padding: "13px 15px",
    outline: "none",
    fontSize: "14px",
  },

  filterSelect: {
    border:
      "1px solid #cbd5e1",
    borderRadius: "13px",
    padding: "13px 15px",
    outline: "none",
    background: "#ffffff",
    fontWeight: "700",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "17px",
    border: "1px solid #e2e8f0",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "850px",
    background: "#ffffff",
  },

  th: {
    textAlign: "left",
    padding: "15px",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: ".6px",
    borderBottom:
      "1px solid #e2e8f0",
  },

  tr: {
    borderBottom:
      "1px solid #f1f5f9",
  },

  td: {
    padding: "15px",
    fontSize: "14px",
    verticalAlign: "middle",
  },

  userCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  avatar: {
    width: "43px",
    height: "43px",
    borderRadius: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg,#eef2ff,#e0f2fe)",
    fontSize: "20px",
  },

  email: {
    display: "block",
    marginTop: "3px",
    color: "#64748b",
    fontSize: "12px",
  },

  roleBadge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    textTransform: "uppercase",
  },

  studentRole: {
    background: "#dbeafe",
    color: "#1d4ed8",
  },

  mentorRole: {
    background: "#dcfce7",
    color: "#15803d",
  },

  adminRole: {
    background: "#fef3c7",
    color: "#a16207",
  },

  actionButtons: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },

  editButton: {
    border: "none",
    borderRadius: "9px",
    padding: "8px 11px",
    background: "#eef2ff",
    color: "#4338ca",
    fontWeight: "800",
    cursor: "pointer",
  },

  deleteButton: {
    border: "none",
    borderRadius: "9px",
    padding: "8px 11px",
    background: "#fef2f2",
    color: "#dc2626",
    fontWeight: "800",
    cursor: "pointer",
  },

  empty: {
    textAlign: "center",
    padding: "55px 20px",
    color: "#64748b",
  },

  emptyIcon: {
    fontSize: "45px",
    marginBottom: "10px",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(240px,1fr))",
    gap: "15px",
    marginBottom: "25px",
  },

  infoCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "20px",
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
    boxShadow:
      "0 10px 30px rgba(15,23,42,.06)",
  },

  infoIcon: {
    fontSize: "28px",
  },

  infoTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "900",
  },

  infoText: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    padding: "20px 5px",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "700",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background:
      "linear-gradient(135deg,#eef2ff,#ecfeff)",
    fontFamily:
      "Inter,system-ui,sans-serif",
  },

  loadingOrb: {
    width: "85px",
    height: "85px",
    borderRadius: "27px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg,#4f46e5,#0891b2)",
    color: "white",
    fontSize: "40px",
    boxShadow:
      "0 20px 50px rgba(79,70,229,.3)",
  },

  loadingTitle: {
    marginBottom: "10px",
  },

  loader: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border:
      "5px solid #e2e8f0",
    borderTopColor: "#4f46e5",
    animation:
      "edubridgeSpin .8s linear infinite",
  },
};

// =====================================================
// ANIMATIONS
// =====================================================

if (
  typeof document !== "undefined" &&
  !document.getElementById(
    "edubridge-admin-animations"
  )
) {
  const style =
    document.createElement("style");

  style.id =
    "edubridge-admin-animations";

  style.innerHTML = `
    @keyframes edubridgeSpin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes edubridgeFade {
      from {
        opacity: 0;
        transform: translateY(-6px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    button {
      transition:
        transform .2s ease,
        box-shadow .2s ease,
        opacity .2s ease;
    }

    button:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
    }

    input:focus,
    select:focus {
      border-color: #6366f1 !important;
      box-shadow:
        0 0 0 3px rgba(99,102,241,.10);
    }

    tr {
      transition: background .2s ease;
    }

    tr:hover {
      background: #f8fafc;
    }

    @media (max-width: 700px) {
      body {
        overflow-x: hidden;
      }
    }
  `;

  document.head.appendChild(style);
}

// =====================================================
// VERY IMPORTANT
// =====================================================

export default AdminDashboard;