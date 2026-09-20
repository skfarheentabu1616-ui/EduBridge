import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [statsData, setStatsData] = useState(null);

  const [activeTab, setActiveTab] = useState("ASSIGNMENT"); // "ASSIGNMENT" | "MENTORS" | "USERS"
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("ALL"); // "ALL" | "ASSIGNED" | "UNASSIGNED"
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Modals & Drawers
  const [assigningStudent, setAssigningStudent] = useState(null);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const [viewingMentor, setViewingMentor] = useState(null);

  const [showCreateMentorModal, setShowCreateMentorModal] = useState(false);
  const [mentorForm, setMentorForm] = useState({
    name: "",
    email: "",
    password: "",
    branch: "",
    section: "",
  });
  const [createMentorLoading, setCreateMentorLoading] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
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

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => {
      setMessage("");
    }, 4000);
  };

  const getId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id || value.id || "";
  };

  // =====================================================
  // LOAD ALL ADMIN DATA
  // =====================================================

  const loadAllData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const [usersRes, studentsRes, mentorsRes, statsRes] = await Promise.all([
        fetch(`${API}/admin/users`, { headers: getHeaders() }),
        fetch(`${API}/admin/students`, { headers: getHeaders() }),
        fetch(`${API}/admin/mentors`, { headers: getHeaders() }),
        fetch(`${API}/admin/stats`, { headers: getHeaders() }),
      ]);

      const [usersData, studentsData, mentorsData, statsInfo] = await Promise.all([
        usersRes.json().catch(() => []),
        studentsRes.json().catch(() => []),
        mentorsRes.json().catch(() => []),
        statsRes.json().catch(() => null),
      ]);

      if (Array.isArray(usersData)) setUsers(usersData);
      else if (usersData && Array.isArray(usersData.users)) setUsers(usersData.users);

      if (Array.isArray(studentsData)) setStudents(studentsData);
      else if (studentsData && Array.isArray(studentsData.students)) setStudents(studentsData.students);

      if (Array.isArray(mentorsData)) setMentors(mentorsData);
      else if (mentorsData && Array.isArray(mentorsData.mentors)) setMentors(mentorsData.mentors);

      if (statsInfo && !statsInfo.error) {
        setStatsData(statsInfo);
      }
    } catch (err) {
      console.error("LOAD ADMIN DATA ERROR:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // =====================================================
  // DERIVED STATS
  // =====================================================

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const assignedStudents = students.filter((s) => Boolean(s.mentor)).length;
    const unassignedStudents = totalStudents - assignedStudents;
    const totalMentors = mentors.length;
    const totalAdmins = users.filter((u) => String(u.role).toUpperCase() === "ADMIN").length;
    const totalUsers = users.length;

    return {
      totalStudents: statsData?.totalStudents ?? totalStudents,
      assignedStudents: statsData?.assignedStudents ?? assignedStudents,
      unassignedStudents: statsData?.unassignedStudents ?? unassignedStudents,
      totalMentors: statsData?.totalMentors ?? totalMentors,
      totalAdmins: statsData?.totalAdmins ?? totalAdmins,
      totalUsers: statsData?.totalUsers ?? totalUsers,
    };
  }, [students, mentors, users, statsData]);

  // =====================================================
  // FILTERED LISTS
  // =====================================================

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const mentorName = s.mentor ? (typeof s.mentor === "object" ? s.mentor.name : "") : "";
      const text = `${s.name || ""} ${s.email || ""} ${s.branch || ""} ${s.section || ""} ${mentorName}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());

      const isAssigned = Boolean(s.mentor);
      const matchesAssignment =
        assignmentFilter === "ALL" ||
        (assignmentFilter === "ASSIGNED" && isAssigned) ||
        (assignmentFilter === "UNASSIGNED" && !isAssigned);

      return matchesSearch && matchesAssignment;
    });
  }, [students, search, assignmentFilter]);

  const filteredMentors = useMemo(() => {
    return mentors.filter((m) => {
      const text = `${m.name || ""} ${m.email || ""} ${m.branch || ""} ${m.section || ""}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [mentors, search]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const text = `${u.name || ""} ${u.email || ""} ${u.branch || ""} ${u.section || ""} ${u.role || ""}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesRole =
        roleFilter === "ALL" || String(u.role || "").toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // =====================================================
  // ASSIGN MENTOR ACTIONS
  // =====================================================

  const openAssignModal = (student) => {
    setAssigningStudent(student);
    const currentMentorId = student.mentor
      ? typeof student.mentor === "object"
        ? student.mentor._id || student.mentor.id
        : student.mentor
      : "";
    setSelectedMentorId(currentMentorId || "");
  };

  const closeAssignModal = () => {
    setAssigningStudent(null);
    setSelectedMentorId("");
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!assigningStudent) return;

    try {
      setAssignLoading(true);
      const studentId = getId(assigningStudent);

      const response = await fetch(`${API}/admin/students/${studentId}/assign-mentor`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          mentorId: selectedMentorId || "unassign",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update mentor assignment");
      }

      showMessage(data.message || "Assignment updated successfully ✅");
      closeAssignModal();
      await loadAllData(true);
    } catch (err) {
      console.error("ASSIGNMENT ERROR:", err);
      showMessage(`${err.message || "Assignment failed"} ❌`);
    } finally {
      setAssignLoading(false);
    }
  };

  // =====================================================
  // CREATE MENTOR ACTIONS
  // =====================================================

  const handleCreateMentor = async (e) => {
    e.preventDefault();

    if (!mentorForm.name.trim() || !mentorForm.email.trim() || !mentorForm.password.trim()) {
      showMessage("Name, email, and password are required ❌");
      return;
    }

    try {
      setCreateMentorLoading(true);

      const response = await fetch(`${API}/admin/mentors`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: mentorForm.name.trim(),
          email: mentorForm.email.trim().toLowerCase(),
          password: mentorForm.password,
          branch: mentorForm.branch.trim(),
          section: mentorForm.section.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create mentor");
      }

      showMessage(`Mentor ${data.mentor?.name || ""} created successfully! 🎉`);
      setMentorForm({ name: "", email: "", password: "", branch: "", section: "" });
      setShowCreateMentorModal(false);
      await loadAllData(true);
    } catch (err) {
      console.error("CREATE MENTOR ERROR:", err);
      showMessage(`${err.message || "Failed to create mentor"} ❌`);
    } finally {
      setCreateMentorLoading(false);
    }
  };

  // =====================================================
  // USER EDIT / DELETE
  // =====================================================

  const startEdit = (item) => {
    setEditingUser(item);
    setUserForm({
      name: item.name || "",
      email: item.email || "",
      role: item.role || "student",
      branch: item.branch || "",
      section: item.section || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setUserForm({
      name: "",
      email: "",
      role: "student",
      branch: "",
      section: "",
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const id = getId(editingUser);
      const response = await fetch(`${API}/admin/users/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          name: userForm.name.trim(),
          branch: userForm.branch.trim(),
          section: userForm.section.trim(),
          role: userForm.role,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update user");
      }

      showMessage("User updated successfully ✅");
      cancelEdit();
      await loadAllData(true);
    } catch (err) {
      console.error("UPDATE USER ERROR:", err);
      showMessage(`${err.message || "Update failed"} ❌`);
    }
  };

  const handleDeleteUser = async (item) => {
    const id = getId(item);
    if (!id) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${item.name || "this user"}?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${API}/admin/users/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete user");
      }

      showMessage("User deleted successfully 🗑️");
      await loadAllData(true);
    } catch (err) {
      console.error("DELETE USER ERROR:", err);
      showMessage(`${err.message || "Delete failed"} ❌`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  // =====================================================
  // LOADING STATE
  // =====================================================

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingOrb}>🎓</div>
        <h1 style={styles.loadingTitle}>EduBridge</h1>
        <div style={styles.loader} />
        <p style={{ marginTop: "12px", color: "#64748b", fontWeight: "600" }}>
          Loading Admin Control Center...
        </p>
      </div>
    );
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.container}>
        {/* ================= HEADER ================= */}
        <header style={styles.header}>
          <div>
            <div style={styles.brand}>🎓 EDUBRIDGE ADMIN PORTAL</div>
            <h1 style={styles.title}>College Academic Administration</h1>
            <p style={styles.subtitle}>
              Logged in as <strong>{user?.name || "Administrator"}</strong> ({user?.email || "admin"}) 👋
            </p>
          </div>

          <div style={styles.headerButtons}>
            <button
              style={styles.refreshButton}
              onClick={() => loadAllData(true)}
              disabled={refreshing}
            >
              {refreshing ? "⏳ Refreshing..." : "🔄 Refresh"}
            </button>

            <button
              style={styles.primaryActionBtn}
              onClick={() => setShowCreateMentorModal(true)}
            >
              ➕ Create Mentor
            </button>

            <button style={styles.logoutButton} onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </header>

        {/* ================= ALERTS ================= */}
        {message && <div style={styles.message}>✨ {message}</div>}
        {error && <div style={styles.error}>⚠️ {error}</div>}

        {/* ================= STATS SUMMARY ================= */}
        <div style={styles.statsGrid}>
          <StatCard
            icon="🎓"
            title="Total Students"
            value={stats.totalStudents}
            tone="blue"
            subtitle="Registered in system"
          />
          <StatCard
            icon="✅"
            title="Assigned Students"
            value={stats.assignedStudents}
            tone="green"
            subtitle="Linked to mentors"
          />
          <StatCard
            icon="⏳"
            title="Unassigned Students"
            value={stats.unassignedStudents}
            tone="orange"
            subtitle="Awaiting mentor assignment"
          />
          <StatCard
            icon="👨‍🏫"
            title="Total Mentors"
            value={stats.totalMentors}
            tone="purple"
            subtitle="Faculty mentor accounts"
          />
          <StatCard
            icon="👥"
            title="Total Users"
            value={stats.totalUsers}
            tone="teal"
            subtitle="Active portal accounts"
          />
        </div>

        {/* ================= NAVIGATION TABS ================= */}
        <div style={styles.tabBar}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "ASSIGNMENT" ? styles.tabButtonActive : {}),
            }}
            onClick={() => setActiveTab("ASSIGNMENT")}
          >
            🎯 Student Assignment & Directory ({students.length})
          </button>

          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "MENTORS" ? styles.tabButtonActive : {}),
            }}
            onClick={() => setActiveTab("MENTORS")}
          >
            👨‍🏫 Mentor Management ({mentors.length})
          </button>

          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "USERS" ? styles.tabButtonActive : {}),
            }}
            onClick={() => setActiveTab("USERS")}
          >
            👥 User Accounts & Roles ({users.length})
          </button>
        </div>

        {/* ================================================= */}
        {/* TAB 1: STUDENT ASSIGNMENT & DIRECTORY */}
        {/* ================================================= */}
        {activeTab === "ASSIGNMENT" && (
          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>🎯 Student Mentorship Assignment</h2>
                <p style={styles.sectionSubtitle}>
                  View all registered students (including self-registered) and assign or reassign them to mentors without restrictions.
                </p>
              </div>

              <div style={styles.badgeGroup}>
                <span style={styles.statPillGreen}>
                  {stats.assignedStudents} Assigned
                </span>
                <span style={styles.statPillOrange}>
                  {stats.unassignedStudents} Unassigned
                </span>
              </div>
            </div>

            {/* Filter bar */}
            <div style={styles.filterBar}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Search student by name, email, branch..."
                style={styles.searchInput}
              />

              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="ALL">All Students ({students.length})</option>
                <option value="ASSIGNED">Assigned Only ({stats.assignedStudents})</option>
                <option value="UNASSIGNED">Unassigned Only ({stats.unassignedStudents})</option>
              </select>
            </div>

            {/* Students Table */}
            {filteredStudents.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>🎓</div>
                <h3>No students found</h3>
                <p>No student records match the search or filter criteria.</p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Student Name & Email</th>
                      <th style={styles.th}>Branch / Section</th>
                      <th style={styles.th}>Assigned Mentor</th>
                      <th style={styles.th}>Assignment Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, idx) => {
                      const mentorObj = s.mentor && typeof s.mentor === "object" ? s.mentor : null;
                      const isAssigned = Boolean(s.mentor);

                      return (
                        <tr key={s._id || `s-${idx}`} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={styles.userCell}>
                              <div style={styles.avatar}>🎓</div>
                              <div>
                                <strong>{s.name || "Student"}</strong>
                                <small style={styles.email}>{s.email}</small>
                              </div>
                            </div>
                          </td>

                          <td style={styles.td}>
                            <span style={styles.branchBadge}>
                              {s.branch || "AIML"} • {s.section || "AIML-A"}
                            </span>
                          </td>

                          <td style={styles.td}>
                            {mentorObj ? (
                              <div>
                                <strong style={{ color: "#0f172a" }}>
                                  👨‍🏫 {mentorObj.name}
                                </strong>
                                <small style={styles.email}>{mentorObj.email}</small>
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                                Not Assigned
                              </span>
                            )}
                          </td>

                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.statusBadge,
                                ...(isAssigned ? styles.statusAssigned : styles.statusUnassigned),
                              }}
                            >
                              {isAssigned ? "✅ Assigned" : "⏳ Unassigned"}
                            </span>
                          </td>

                          <td style={styles.td}>
                            <button
                              onClick={() => openAssignModal(s)}
                              style={isAssigned ? styles.reassignBtn : styles.assignBtn}
                            >
                              {isAssigned ? "🔄 Reassign Mentor" : "➕ Assign Mentor"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ================================================= */}
        {/* TAB 2: MENTOR MANAGEMENT */}
        {/* ================================================= */}
        {activeTab === "MENTORS" && (
          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>👨‍🏫 Mentor Accounts & Distribution</h2>
                <p style={styles.sectionSubtitle}>
                  Create mentors and review assigned student distributions. (Student counts are informational).
                </p>
              </div>

              <button
                style={styles.primaryActionBtn}
                onClick={() => setShowCreateMentorModal(true)}
              >
                ➕ Create New Mentor
              </button>
            </div>

            {/* Mentors Grid / Table */}
            {filteredMentors.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>👨‍🏫</div>
                <h3>No Mentors Found</h3>
                <p>Click "Create New Mentor" above to add your first mentor account.</p>
              </div>
            ) : (
              <div style={styles.mentorCardsGrid}>
                {filteredMentors.map((m, idx) => {
                  const assignedCount = m.assignedCount ?? (Array.isArray(m.assignedStudents) ? m.assignedStudents.length : 0);

                  return (
                    <div key={m._id || `m-${idx}`} style={styles.mentorCard}>
                      <div style={styles.mentorCardHeader}>
                        <div style={styles.mentorAvatar}>👨‍🏫</div>
                        <div>
                          <h3 style={styles.mentorCardName}>{m.name}</h3>
                          <small style={styles.email}>{m.email}</small>
                        </div>
                      </div>

                      <div style={styles.mentorMetaRow}>
                        <span style={styles.mentorMetaTag}>
                          🏛️ {m.branch || "AIML"} ({m.section || "AIML-A"})
                        </span>
                        <span style={styles.assignedCountTag}>
                          👥 {assignedCount} {assignedCount === 1 ? "Student" : "Students"} Assigned
                        </span>
                      </div>

                      <div style={styles.mentorCardActions}>
                        <button
                          style={styles.viewStudentsBtn}
                          onClick={() => setViewingMentor(m)}
                        >
                          👁️ View Assigned Students ({assignedCount})
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================================================= */}
        {/* TAB 3: USER MANAGEMENT & ACCOUNTS */}
        {/* ================================================= */}
        {activeTab === "USERS" && (
          <section style={styles.card}>
            {editingUser && (
              <div style={styles.editBox}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>
                      ✏️ Edit User: {editingUser.name}
                    </h3>
                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
                      Update account details
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateUser} style={styles.formGrid}>
                  <Field label="Full Name">
                    <input
                      name="name"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Email Address">
                    <input
                      value={userForm.email}
                      disabled
                      style={{ ...styles.input, background: "#f1f5f9" }}
                    />
                  </Field>

                  <Field label="Role">
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                      style={styles.input}
                    >
                      <option value="STUDENT">Student</option>
                      <option value="MENTOR">Mentor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </Field>

                  <Field label="Branch">
                    <input
                      value={userForm.branch}
                      onChange={(e) => setUserForm({ ...userForm, branch: e.target.value })}
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Section">
                    <input
                      value={userForm.section}
                      onChange={(e) => setUserForm({ ...userForm, section: e.target.value })}
                      style={styles.input}
                    />
                  </Field>

                  <div style={styles.formButtons}>
                    <button type="submit" style={styles.primaryButton}>
                      💾 Save
                    </button>
                    <button type="button" onClick={cancelEdit} style={styles.secondaryButton}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>👥 User Accounts Directory</h2>
                <p style={styles.sectionSubtitle}>All registered college portal users</p>
              </div>
              <div style={styles.userCount}>{filteredUsers.length} Users</div>
            </div>

            <div style={styles.filterBar}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Search name, email, role..."
                style={styles.searchInput}
              />

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Students</option>
                <option value="MENTOR">Mentors</option>
                <option value="ADMIN">Admins</option>
                <option value="PARENT">Parents</option>
              </select>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Branch / Section</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, idx) => {
                    const role = String(u.role || "student").toUpperCase();

                    return (
                      <tr key={u._id || `u-${idx}`} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={styles.userCell}>
                            <div style={styles.avatar}>
                              {role === "STUDENT" ? "🎓" : role === "MENTOR" ? "👨‍🏫" : role === "ADMIN" ? "🛡️" : "👪"}
                            </div>
                            <div>
                              <strong>{u.name || "User"}</strong>
                              <small style={styles.email}>{u.email}</small>
                            </div>
                          </div>
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.roleBadge,
                              ...(role === "STUDENT"
                                ? styles.studentRole
                                : role === "ADMIN"
                                ? styles.adminRole
                                : role === "MENTOR"
                                ? styles.mentorRole
                                : styles.parentRole),
                            }}
                          >
                            {role}
                          </span>
                        </td>

                        <td style={styles.td}>
                          {u.branch || "-"} {u.section ? `• ${u.section}` : ""}
                        </td>

                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            <button onClick={() => startEdit(u)} style={styles.editButton}>
                              ✏️ Edit
                            </button>
                            <button onClick={() => handleDeleteUser(u)} style={styles.deleteButton}>
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* MODAL: ASSIGN MENTOR */}
        {/* ================================================= */}
        {assigningStudent && (
          <div style={styles.modalOverlay} onClick={closeAssignModal}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <h3 style={styles.modalTitle}>🎯 Assign Mentor to Student</h3>
                  <p style={styles.modalSubtitle}>
                    Select a mentor for <strong>{assigningStudent.name}</strong> ({assigningStudent.email})
                  </p>
                </div>
                <button style={styles.modalCloseBtn} onClick={closeAssignModal}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAssignment}>
                <div style={{ marginBottom: "20px" }}>
                  <label style={styles.label}>Select Mentor</label>
                  <select
                    value={selectedMentorId}
                    onChange={(e) => setSelectedMentorId(e.target.value)}
                    style={styles.modalSelect}
                  >
                    <option value="">-- Select a Mentor --</option>
                    <option value="unassign">⚠️ [Unassign / Remove Mentor]</option>
                    {mentors.map((m) => {
                      const count = m.assignedCount ?? (Array.isArray(m.assignedStudents) ? m.assignedStudents.length : 0);
                      return (
                        <option key={m._id} value={m._id}>
                          👨‍🏫 {m.name} ({m.email}) • {m.branch || "AIML"} • {count} Students
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={closeAssignModal}
                    style={styles.secondaryButton}
                    disabled={assignLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={styles.primaryButton}
                    disabled={assignLoading}
                  >
                    {assignLoading ? "Saving..." : "💾 Save Assignment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* MODAL: CREATE MENTOR */}
        {/* ================================================= */}
        {showCreateMentorModal && (
          <div
            style={styles.modalOverlay}
            onClick={() => setShowCreateMentorModal(false)}
          >
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <h3 style={styles.modalTitle}>➕ Create Faculty Mentor Account</h3>
                  <p style={styles.modalSubtitle}>
                    Mentor accounts are created securely by the administrator.
                  </p>
                </div>
                <button
                  style={styles.modalCloseBtn}
                  onClick={() => setShowCreateMentorModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateMentor} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <Field label="Mentor Full Name">
                  <input
                    required
                    value={mentorForm.name}
                    onChange={(e) => setMentorForm({ ...mentorForm, name: e.target.value })}
                    placeholder="e.g. Dr. Anita Rao"
                    style={styles.input}
                  />
                </Field>

                <Field label="Official Email Address">
                  <input
                    required
                    type="email"
                    value={mentorForm.email}
                    onChange={(e) => setMentorForm({ ...mentorForm, email: e.target.value })}
                    placeholder="e.g. anita@mentor.com"
                    style={styles.input}
                  />
                </Field>

                <Field label="Password (Min 6 characters)">
                  <input
                    required
                    type="password"
                    value={mentorForm.password}
                    onChange={(e) => setMentorForm({ ...mentorForm, password: e.target.value })}
                    placeholder="••••••••"
                    style={styles.input}
                  />
                </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Field label="Branch / Department">
                    <input
                      value={mentorForm.branch}
                      onChange={(e) => setMentorForm({ ...mentorForm, branch: e.target.value })}
                      placeholder="e.g. AIML"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Section">
                    <input
                      value={mentorForm.section}
                      onChange={(e) => setMentorForm({ ...mentorForm, section: e.target.value })}
                      placeholder="e.g. AIML-A"
                      style={styles.input}
                    />
                  </Field>
                </div>

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setShowCreateMentorModal(false)}
                    style={styles.secondaryButton}
                    disabled={createMentorLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={styles.primaryButton}
                    disabled={createMentorLoading}
                  >
                    {createMentorLoading ? "Creating Mentor..." : "🚀 Create Mentor Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* MODAL: VIEW ASSIGNED STUDENTS */}
        {/* ================================================= */}
        {viewingMentor && (
          <div style={styles.modalOverlay} onClick={() => setViewingMentor(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <h3 style={styles.modalTitle}>
                    👨‍🏫 Students Assigned to {viewingMentor.name}
                  </h3>
                  <p style={styles.modalSubtitle}>
                    {viewingMentor.email} • {viewingMentor.branch || "AIML"} ({viewingMentor.section || "AIML-A"})
                  </p>
                </div>
                <button style={styles.modalCloseBtn} onClick={() => setViewingMentor(null)}>
                  ✕
                </button>
              </div>

              {/* Find students for this mentor */}
              {(() => {
                const assignedList = students.filter((s) => {
                  const mId = s.mentor
                    ? typeof s.mentor === "object"
                      ? s.mentor._id || s.mentor.id
                      : s.mentor
                    : null;
                  return String(mId) === String(viewingMentor._id);
                });

                if (assignedList.length === 0) {
                  return (
                    <div style={styles.empty}>
                      <div style={styles.emptyIcon}>🎓</div>
                      <h4>No students assigned yet</h4>
                      <p>Use the "Student Assignment" tab to assign students to {viewingMentor.name}.</p>
                    </div>
                  );
                }

                return (
                  <div style={{ maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {assignedList.map((s, idx) => (
                      <div key={s._id || idx} style={styles.studentListItem}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={styles.miniAvatar}>🎓</div>
                          <div>
                            <strong>{s.name}</strong>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>{s.email}</div>
                          </div>
                        </div>
                        <span style={styles.branchBadge}>
                          {s.branch || "AIML"} • {s.section || "AIML-A"}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{ marginTop: "20px", textAlign: "right" }}>
                <button
                  style={styles.secondaryButton}
                  onClick={() => setViewingMentor(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= FOOTER ================= */}
        <footer style={styles.footer}>
          <span>🎓 EduBridge Academic Portal • Administration Console</span>
          <span>Role-Based Mentor Management & Student Assignment System</span>
        </footer>
      </div>
    </div>
  );
}

// =====================================================
// HELPER COMPONENTS
// =====================================================

function StatCard({ icon, title, value, tone, subtitle }) {
  const toneStyle = styles[`tone_${tone}`] || styles.tone_purple;

  return (
    <div style={{ ...styles.statCard, ...toneStyle }}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <p style={styles.statTitle}>{title}</p>
        <h2 style={styles.statValue}>{value}</h2>
        {subtitle && <p style={styles.statSubtitle}>{subtitle}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#eef2ff 0%,#f8fafc 45%,#ecfeff 100%)",
    padding: "30px 20px",
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    color: "#0f172a",
    position: "relative",
    overflow: "hidden",
  },
  glowOne: {
    position: "fixed",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    background: "rgba(99,102,241,.12)",
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
    background: "rgba(6,182,212,.10)",
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
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "2.5px",
    color: "#4f46e5",
    marginBottom: "6px",
  },
  title: {
    margin: 0,
    fontSize: "34px",
    fontWeight: "900",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    color: "#64748b",
    marginTop: "6px",
    marginBottom: 0,
    fontSize: "15px",
  },
  headerButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  refreshButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    padding: "12px 18px",
    background: "#ffffff",
    color: "#334155",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(15,23,42,.06)",
  },
  primaryActionBtn: {
    border: "none",
    borderRadius: "14px",
    padding: "12px 20px",
    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    color: "white",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 8px 25px rgba(79,70,229,.3)",
  },
  logoutButton: {
    border: "none",
    borderRadius: "14px",
    padding: "12px 18px",
    background: "linear-gradient(135deg,#ef4444,#dc2626)",
    color: "white",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(239,68,68,.2)",
  },
  message: {
    background: "#ecfdf5",
    color: "#047857",
    border: "1px solid #a7f3d0",
    borderRadius: "14px",
    padding: "14px 18px",
    marginBottom: "20px",
    fontWeight: "700",
    animation: "edubridgeFade .35s ease",
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
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    borderRadius: "22px",
    padding: "20px 22px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#ffffff",
    boxShadow: "0 10px 30px rgba(15,23,42,.06)",
    border: "1px solid rgba(255,255,255,.9)",
  },
  statIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "26px",
    background: "rgba(255,255,255,.85)",
  },
  statTitle: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "700",
  },
  statValue: {
    margin: "3px 0 0",
    fontSize: "28px",
    fontWeight: "900",
  },
  statSubtitle: {
    margin: "2px 0 0",
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: "600",
  },
  tone_purple: { background: "linear-gradient(135deg,#eef2ff,#ffffff)" },
  tone_blue: { background: "linear-gradient(135deg,#eff6ff,#ffffff)" },
  tone_green: { background: "linear-gradient(135deg,#ecfdf5,#ffffff)" },
  tone_orange: { background: "linear-gradient(135deg,#fff7ed,#ffffff)" },
  tone_teal: { background: "linear-gradient(135deg,#f0fdfa,#ffffff)" },

  tabBar: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  tabButton: {
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#64748b",
    borderRadius: "14px",
    padding: "12px 20px",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(15,23,42,.03)",
  },
  tabButtonActive: {
    background: "linear-gradient(135deg,#4f46e5,#6366f1)",
    color: "white",
    borderColor: "#4f46e5",
    boxShadow: "0 8px 25px rgba(79,70,229,.25)",
  },

  card: {
    background: "rgba(255,255,255,.94)",
    borderRadius: "24px",
    padding: "26px",
    marginBottom: "24px",
    boxShadow: "0 15px 45px rgba(15,23,42,.06)",
    border: "1px solid rgba(226,232,240,.9)",
    backdropFilter: "blur(12px)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "900",
  },
  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  badgeGroup: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  statPillGreen: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "6px 12px",
    borderRadius: "20px",
    fontWeight: "800",
    fontSize: "12px",
  },
  statPillOrange: {
    background: "#ffedd5",
    color: "#c2410c",
    padding: "6px 12px",
    borderRadius: "20px",
    fontWeight: "800",
    fontSize: "12px",
  },
  filterBar: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: 1,
    minWidth: "260px",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    padding: "12px 16px",
    outline: "none",
    fontSize: "14px",
  },
  filterSelect: {
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    padding: "12px 16px",
    outline: "none",
    background: "#ffffff",
    fontWeight: "700",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "16px",
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
    padding: "14px 16px",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: ".6px",
    borderBottom: "1px solid #e2e8f0",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "14px 16px",
    fontSize: "14px",
    verticalAlign: "middle",
  },
  userCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg,#eef2ff,#e0f2fe)",
    fontSize: "18px",
  },
  miniAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eef2ff",
    fontSize: "15px",
  },
  email: {
    display: "block",
    marginTop: "2px",
    color: "#64748b",
    fontSize: "12px",
  },
  branchBadge: {
    display: "inline-block",
    background: "#f1f5f9",
    color: "#334155",
    padding: "4px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "800",
  },
  statusAssigned: {
    background: "#dcfce7",
    color: "#166534",
  },
  statusUnassigned: {
    background: "#ffedd5",
    color: "#9a3412",
  },
  assignBtn: {
    border: "none",
    borderRadius: "10px",
    padding: "8px 14px",
    background: "linear-gradient(135deg,#4f46e5,#6366f1)",
    color: "white",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer",
  },
  reassignBtn: {
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "8px 14px",
    background: "#f8fafc",
    color: "#334155",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer",
  },

  mentorCardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
    gap: "18px",
  },
  mentorCard: {
    borderRadius: "20px",
    padding: "22px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 25px rgba(15,23,42,.04)",
  },
  mentorCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "14px",
  },
  mentorAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "16px",
    background: "linear-gradient(135deg,#eef2ff,#ede9fe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  },
  mentorCardName: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "900",
  },
  mentorMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "16px",
    padding: "10px 12px",
    background: "#f8fafc",
    borderRadius: "12px",
  },
  mentorMetaTag: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#475569",
  },
  assignedCountTag: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#4f46e5",
  },
  mentorCardActions: {
    display: "flex",
    gap: "10px",
  },
  viewStudentsBtn: {
    flex: 1,
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "10px 14px",
    background: "#ffffff",
    color: "#334155",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
  },

  // Modal styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15,23,42,.6)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modalContent: {
    background: "#ffffff",
    borderRadius: "24px",
    padding: "28px",
    maxWidth: "520px",
    width: "100%",
    boxShadow: "0 25px 60px rgba(0,0,0,.25)",
    animation: "edubridgeFade .25s ease",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  modalTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "900",
    color: "#0f172a",
  },
  modalSubtitle: {
    margin: "5px 0 0",
    fontSize: "13px",
    color: "#64748b",
  },
  modalCloseBtn: {
    border: "none",
    background: "#f1f5f9",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "800",
    color: "#64748b",
  },
  modalSelect: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "12px 14px",
    outline: "none",
    fontSize: "14px",
    marginTop: "6px",
    background: "#ffffff",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },

  studentListItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },

  // Form styles
  editBox: {
    background: "#f8fafc",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "24px",
    border: "1px solid #e2e8f0",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#475569",
  },
  input: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "10px 12px",
    outline: "none",
    fontSize: "14px",
    background: "#ffffff",
    color: "#0f172a",
    boxSizing: "border-box",
  },
  formButtons: {
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
  },
  primaryButton: {
    border: "none",
    borderRadius: "12px",
    padding: "12px 20px",
    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
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

  userCount: {
    background: "#eef2ff",
    color: "#4338ca",
    borderRadius: "999px",
    padding: "6px 12px",
    fontWeight: "800",
    fontSize: "12px",
  },

  roleBadge: {
    display: "inline-flex",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    textTransform: "uppercase",
  },
  studentRole: { background: "#dbeafe", color: "#1d4ed8" },
  mentorRole: { background: "#dcfce7", color: "#15803d" },
  adminRole: { background: "#fef3c7", color: "#a16207" },
  parentRole: { background: "#fce7f3", color: "#be185d" },

  actionButtons: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  editButton: {
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    background: "#eef2ff",
    color: "#4338ca",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "12px",
  },
  deleteButton: {
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    background: "#fef2f2",
    color: "#dc2626",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "12px",
  },

  empty: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#64748b",
  },
  emptyIcon: {
    fontSize: "40px",
    marginBottom: "8px",
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
    background: "linear-gradient(135deg,#eef2ff,#ecfeff)",
    fontFamily: "Inter,system-ui,sans-serif",
  },
  loadingOrb: {
    width: "80px",
    height: "80px",
    borderRadius: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg,#4f46e5,#0891b2)",
    color: "white",
    fontSize: "38px",
    boxShadow: "0 20px 50px rgba(79,70,229,.3)",
  },
  loadingTitle: {
    margin: "12px 0 6px",
    fontWeight: "900",
  },
  loader: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "4px solid #e2e8f0",
    borderTopColor: "#4f46e5",
    animation: "edubridgeSpin .8s linear infinite",
  },
};

export default AdminDashboard;