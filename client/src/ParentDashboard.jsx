
import { useEffect, useState, useMemo } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function ParentDashboard({ user: propUser, onLogout }) {
  const [user, setUser] = useState(() => {
    if (propUser) return propUser;
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [studentDetails, setStudentDetails] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [leaveLetters, setLeaveLetters] = useState([]);
  const [issues, setIssues] = useState([]);
  const [fees, setFees] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [observations, setObservations] = useState([]);

  const [activeTab, setActiveTab] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const student = user?.student;
  const studentId =
    typeof student === "object"
      ? student?._id || student?.id
      : student;

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const safeGet = async (url) => {
    try {
      const response = await fetch(url, { headers: getHeaders() });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return null;
      }
      const data = await response.json();
      if (!response.ok) return null;
      return data;
    } catch {
      return null;
    }
  };

  const loadStudentData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      if (!studentId) {
        setMessage("Linked student information not found ❌");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch all academic details in parallel
      const [
        attData,
        marksData,
        leaveData,
        issueData,
        feeData,
        holidayData,
        obsData,
        allStudents,
      ] = await Promise.all([
        safeGet(`${API}/attendance/student/${studentId}`),
        safeGet(`${API}/marks/student/${studentId}`),
        safeGet(`${API}/leave/student/${studentId}`),
        safeGet(`${API}/issues/student/${studentId}`),
        safeGet(`${API}/fees/student/${studentId}`),
        safeGet(`${API}/holidays`),
        safeGet(`${API}/observations/student/${studentId}`),
        safeGet(`${API}/auth/students`),
      ]);

      // Normalize Attendance
      const rawAtt =
        attData?.attendance ||
        attData?.records ||
        attData?.data ||
        (Array.isArray(attData) ? attData : []);
      setAttendance(Array.isArray(rawAtt) ? rawAtt : []);

      // Normalize Marks
      const rawMarks =
        marksData?.marks ||
        marksData?.records ||
        marksData?.data ||
        (Array.isArray(marksData) ? marksData : []);
      setMarks(Array.isArray(rawMarks) ? rawMarks : []);

      // Normalize Leaves
      const rawLeaves =
        leaveData?.leaveLetters ||
        leaveData?.leaves ||
        leaveData?.records ||
        leaveData?.data ||
        (Array.isArray(leaveData) ? leaveData : []);
      setLeaveLetters(Array.isArray(rawLeaves) ? rawLeaves : []);

      // Normalize Issues
      const rawIssues =
        issueData?.issues ||
        issueData?.records ||
        issueData?.data ||
        (Array.isArray(issueData) ? issueData : []);
      setIssues(Array.isArray(rawIssues) ? rawIssues : []);

      // Normalize Fees
      const rawFees =
        feeData?.fees ||
        feeData?.records ||
        feeData?.data ||
        (Array.isArray(feeData) ? feeData : []);
      setFees(Array.isArray(rawFees) ? rawFees : []);

      // Normalize Holidays
      const rawHolidays =
        holidayData?.holidays ||
        holidayData?.records ||
        holidayData?.data ||
        (Array.isArray(holidayData) ? holidayData : []);
      setHolidays(Array.isArray(rawHolidays) ? rawHolidays : []);

      // Normalize Observations
      const rawObs =
        obsData?.observations ||
        obsData?.records ||
        obsData?.data ||
        (Array.isArray(obsData) ? obsData : []);
      setObservations(Array.isArray(rawObs) ? rawObs : []);

      // Student metadata
      let sMeta = null;
      const studentList = Array.isArray(allStudents)
        ? allStudents
        : allStudents?.students || [];
      if (Array.isArray(studentList)) {
        sMeta = studentList.find((s) => String(s._id || s.id) === String(studentId));
      }
      if (sMeta) {
        setStudentDetails(sMeta);
      } else if (typeof student === "object") {
        setStudentDetails(student);
      }

      const branch =
        sMeta?.branch ||
        (typeof student === "object" ? student.branch : "") ||
        "AIML";
      const section =
        sMeta?.section ||
        (typeof student === "object" ? student.section : "") ||
        "AIML-A";

      if (branch && section) {
        const ttData = await safeGet(
          `${API}/timetable/class/${encodeURIComponent(branch)}/${encodeURIComponent(section)}`
        );
        const rawTt =
          ttData?.timetable ||
          ttData?.records ||
          ttData?.data ||
          (Array.isArray(ttData) ? ttData : []);
        setTimetable(Array.isArray(rawTt) ? rawTt : []);
      }

      setMessage("");
    } catch (error) {
      console.error("PARENT DASHBOARD LOAD ERROR:", error);
      setMessage("Some student records could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  // ==========================================
  // METRICS & CALCULATIONS
  // ==========================================

  const presentCount = attendance.filter(
    (r) => String(r.status || "").toUpperCase() === "PRESENT"
  ).length;

  const absentCount = attendance.filter(
    (r) => String(r.status || "").toUpperCase() === "ABSENT"
  ).length;

  const leaveCount = attendance.filter(
    (r) => String(r.status || "").toUpperCase() === "LEAVE"
  ).length;

  const countedClasses = presentCount + absentCount;
  const attendancePercentage =
    countedClasses > 0
      ? ((presentCount / countedClasses) * 100).toFixed(1)
      : attendance.length === 0
      ? "100.0"
      : "100.0";

  const totalFee = fees.reduce((sum, f) => sum + Number(f.totalAmount || 0), 0);
  const paidFee = fees.reduce((sum, f) => sum + Number(f.paidAmount || 0), 0);
  const dueFee = Math.max(totalFee - paidFee, 0);

  const averageMarks = useMemo(() => {
    if (marks.length === 0) return 0;
    const totalPct = marks.reduce((sum, m) => {
      const max = Number(m.maxMarks || 100);
      const obt = Number(m.marksObtained || 0);
      return sum + (max > 0 ? (obt / max) * 100 : 0);
    }, 0);
    return (totalPct / marks.length).toFixed(1);
  }, [marks]);

  const timetableByDay = useMemo(() => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const grouped = {};
    days.forEach((d) => {
      grouped[d] = timetable
        .filter((item) => String(item.day || "").toLowerCase() === d.toLowerCase())
        .sort((a, b) => Number(a.period || 0) - Number(b.period || 0));
    });
    return grouped;
  }, [timetable]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  const formatDate = (d) => {
    if (!d) return "-";
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) return String(d);
    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const money = (val) => Number(val || 0).toLocaleString("en-IN");

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingOrb}>👪</div>
        <h2 style={{ margin: "16px 0 6px", color: "#0f172a", fontSize: "22px" }}>
          EduBridge Parent Portal
        </h2>
        <div style={styles.loader} />
        <p style={{ color: "#64748b", fontSize: "14px", marginTop: "12px" }}>
          Connecting with student records... ✨
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Ambient background glows */}
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.container}>
        {/* ================================================= */}
        {/* TOP HEADER */}
        {/* ================================================= */}
        <header style={styles.header}>
          <div>
            <div style={styles.brandBadge}>
              <span>🎓 EDUBRIDGE</span>
              <span style={styles.roleBadge}>👪 Parent Portal</span>
            </div>
            <h1 style={styles.mainTitle}>Parent Dashboard</h1>
            <p style={styles.subtitle}>
              Welcome back, <strong>{user?.name || "Parent"}</strong>! 👋 Tracking academic growth & college life.
            </p>
          </div>

          <div style={styles.headerActions}>
            <button
              style={styles.refreshBtn}
              onClick={() => loadStudentData(true)}
              disabled={refreshing}
            >
              {refreshing ? "⏳ Syncing..." : "🔄 Refresh Data"}
            </button>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              🚪 Sign Out
            </button>
          </div>
        </header>

        {/* ================================================= */}
        {/* LINKED STUDENT SPOTLIGHT CARD */}
        {/* ================================================= */}
        <section style={styles.studentCard}>
          <div style={styles.studentAvatar}>
            👨‍🎓
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              WARD / LINKED STUDENT
            </div>
            <h2 style={styles.studentName}>
              {studentDetails?.name || (typeof student === "object" ? student?.name : "Rahul Student")}
            </h2>
            <div style={styles.studentMetaList}>
              <span style={styles.metaChip}>
                📧 {studentDetails?.email || (typeof student === "object" ? student?.email : "rahul@student.com")}
              </span>
              <span style={styles.metaChip}>
                🏢 Branch: <strong>{studentDetails?.branch || "AIML"}</strong>
              </span>
              <span style={styles.metaChip}>
                📚 Section: <strong>{studentDetails?.section || "AIML-A"}</strong>
              </span>
              <span style={{ ...styles.metaChip, background: "#dcfce7", color: "#15803d", borderColor: "#bbf7d0" }}>
                ✅ Active Enrollment
              </span>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* KEY ANALYTICS STATS GRID */}
        {/* ================================================= */}
        <div style={styles.statsGrid}>
          {/* Attendance */}
          <div style={{ ...styles.statCard, borderLeft: "5px solid #10b981" }}>
            <div style={styles.statHeader}>
              <span style={styles.statIcon}>📅</span>
              <span style={styles.statLabel}>Attendance Rate</span>
            </div>
            <div style={styles.statValue}>{attendancePercentage}%</div>
            <div style={styles.statFooter}>
              <span style={{ color: "#10b981", fontWeight: "700" }}>{presentCount} Present</span>
              <span>•</span>
              <span style={{ color: "#ef4444", fontWeight: "700" }}>{absentCount} Absent</span>
              {leaveCount > 0 && (
                <>
                  <span>•</span>
                  <span style={{ color: "#8b5cf6", fontWeight: "700" }}>{leaveCount} Leave</span>
                </>
              )}
            </div>
          </div>

          {/* Academic Average */}
          <div style={{ ...styles.statCard, borderLeft: "5px solid #6366f1" }}>
            <div style={styles.statHeader}>
              <span style={styles.statIcon}>📚</span>
              <span style={styles.statLabel}>Academic Average</span>
            </div>
            <div style={styles.statValue}>{averageMarks}%</div>
            <div style={styles.statFooter}>
              <span>{marks.length} Exam Records Listed</span>
            </div>
          </div>

          {/* Fee Balance */}
          <div style={{ ...styles.statCard, borderLeft: `5px solid ${dueFee === 0 ? "#10b981" : "#f59e0b"}` }}>
            <div style={styles.statHeader}>
              <span style={styles.statIcon}>💳</span>
              <span style={styles.statLabel}>Fee Status</span>
            </div>
            <div style={styles.statValue}>
              {dueFee === 0 ? "₹0 Due" : `₹${money(dueFee)} Due`}
            </div>
            <div style={styles.statFooter}>
              <span>Paid: ₹{money(paidFee)}</span>
              <span>/</span>
              <span>Total: ₹{money(totalFee)}</span>
            </div>
          </div>

          {/* Leaves & Issues */}
          <div style={{ ...styles.statCard, borderLeft: "5px solid #ec4899" }}>
            <div style={styles.statHeader}>
              <span style={styles.statIcon}>📝</span>
              <span style={styles.statLabel}>Leaves & Issues</span>
            </div>
            <div style={styles.statValue}>
              {leaveLetters.length} Leaves
            </div>
            <div style={styles.statFooter}>
              <span style={{ color: "#ec4899", fontWeight: "600" }}>
                {issues.length} Classroom Issues
              </span>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* NAVIGATION TABS */}
        {/* ================================================= */}
        <div style={styles.tabContainer}>
          {[
            { id: "ALL", label: "🌟 Overview", count: null },
            { id: "ATTENDANCE", label: "📅 Attendance", count: attendance.length },
            { id: "MARKS", label: "📚 Exam Marks", count: marks.length },
            { id: "FEES", label: "💳 Fee Invoices", count: fees.length },
            { id: "LEAVES", label: "📝 Leave Requests", count: leaveLetters.length },
            { id: "ISSUES", label: "🏫 Classroom Issues", count: issues.length },
            { id: "TIMETABLE", label: "🗓️ Timetable", count: timetable.length },
            { id: "OBSERVATIONS", label: "👀 Observations", count: observations.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.activeTabBtn : {}),
              }}
            >
              {tab.label}
              {tab.count !== null && (
                <span
                  style={{
                    ...styles.tabCount,
                    ...(activeTab === tab.id ? styles.activeTabCount : {}),
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error / Feedback banner */}
        {message && (
          <div style={styles.alertBanner}>
            <span>⚠️ {message}</span>
          </div>
        )}

        {/* ================================================= */}
        {/* TAB 1: ATTENDANCE */}
        {/* ================================================= */}
        {(activeTab === "ALL" || activeTab === "ATTENDANCE") && (
          <section style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>📅 Attendance Records</h2>
                <p style={styles.sectionSubtitle}>Daily classroom presence & leave approvals</p>
              </div>
              <span style={styles.headerCount}>{attendance.length} Total Sessions</span>
            </div>

            {attendance.length === 0 ? (
              <div style={styles.emptyBox}>
                <div style={styles.emptyIcon}>📭</div>
                <div style={styles.emptyTitle}>No Attendance Records Yet</div>
                <div style={styles.emptyDesc}>Attendance marked by the mentor will appear here in real-time.</div>
              </div>
            ) : (
              <div style={styles.recordGrid}>
                {attendance.map((rec) => {
                  const st = String(rec.status || "").toUpperCase();
                  const isPresent = st === "PRESENT";
                  const isLeave = st === "LEAVE";

                  return (
                    <div
                      key={rec._id}
                      style={{
                        ...styles.itemCard,
                        borderLeft: `4px solid ${
                          isPresent ? "#10b981" : isLeave ? "#8b5cf6" : "#ef4444"
                        }`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={styles.dateLabel}>🗓️ {formatDate(rec.date)}</span>
                        <span
                          style={{
                            ...styles.statusBadge,
                            background: isPresent ? "#dcfce7" : isLeave ? "#ede9fe" : "#fee2e2",
                            color: isPresent ? "#15803d" : isLeave ? "#6d28d9" : "#b91c1c",
                            borderColor: isPresent ? "#86efac" : isLeave ? "#c4b5fd" : "#fca5a5",
                          }}
                        >
                          {isPresent ? "PRESENT ✅" : isLeave ? "EXCUSED LEAVE 🏖️" : "ABSENT ❌"}
                        </span>
                      </div>
                      {rec.reason && (
                        <div style={styles.reasonText}>
                          <strong>Note:</strong> {rec.reason}
                        </div>
                      )}
                      <div style={styles.mentorFooter}>
                        👨‍🏫 Mentor: {rec.mentor?.name || "Faculty"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================================================= */}
        {/* TAB 2: MARKS & EXAMS */}
        {/* ================================================= */}
        {(activeTab === "ALL" || activeTab === "MARKS") && (
          <section style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>📚 Examination & Academic Grades</h2>
                <p style={styles.sectionSubtitle}>Performance across Mid Terms, Internals & Lab Assessments</p>
              </div>
              <span style={styles.headerCount}>{marks.length} Subjects</span>
            </div>

            {marks.length === 0 ? (
              <div style={styles.emptyBox}>
                <div style={styles.emptyIcon}>📝</div>
                <div style={styles.emptyTitle}>No Examination Scores Published</div>
                <div style={styles.emptyDesc}>Marks entered by faculty will be available here immediately.</div>
              </div>
            ) : (
              <div style={styles.recordGrid}>
                {marks.map((m) => {
                  const max = Number(m.maxMarks || 100);
                  const obt = Number(m.marksObtained || 0);
                  const pct = max > 0 ? ((obt / max) * 100).toFixed(1) : 0;
                  const isHigh = pct >= 75;

                  return (
                    <div key={m._id} style={{ ...styles.itemCard, borderLeft: "4px solid #6366f1" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <h3 style={styles.cardMainTitle}>{m.subject}</h3>
                          <span style={styles.examTag}>🏷️ {m.exam}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              ...styles.scoreBadge,
                              background: isHigh ? "#e0e7ff" : "#fef3c7",
                              color: isHigh ? "#4338ca" : "#b45309",
                            }}
                          >
                            {obt} / {max}
                          </span>
                          <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", marginTop: "4px" }}>
                            {pct}% Score
                          </div>
                        </div>
                      </div>

                      {/* Score bar */}
                      <div style={styles.progressBarBg}>
                        <div
                          style={{
                            ...styles.progressBarFill,
                            width: `${Math.min(pct, 100)}%`,
                            background: isHigh
                              ? "linear-gradient(90deg, #6366f1, #10b981)"
                              : "linear-gradient(90deg, #f59e0b, #ef4444)",
                          }}
                        />
                      </div>

                      <div style={styles.mentorFooter}>
                        👨‍🏫 Evaluated by: {m.mentor?.name || "Department Faculty"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================================================= */}
        {/* TAB 3: FEE STATUS */}
        {/* ================================================= */}
        {(activeTab === "ALL" || activeTab === "FEES") && (
          <section style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>💳 Fee & Tuition Accounts</h2>
                <p style={styles.sectionSubtitle}>College tuition, exam fees, and payment status</p>
              </div>
              <span style={styles.headerCount}>{fees.length} Invoices</span>
            </div>

            {fees.length === 0 ? (
              <div style={styles.emptyBox}>
                <div style={styles.emptyIcon}>💰</div>
                <div style={styles.emptyTitle}>No Invoices On Record</div>
                <div style={styles.emptyDesc}>Student fees and payment receipts will be recorded here.</div>
              </div>
            ) : (
              <div style={styles.recordGrid}>
                {fees.map((fee) => {
                  const rem = Math.max(Number(fee.totalAmount || 0) - Number(fee.paidAmount || 0), 0);
                  const isPaid = rem === 0;

                  return (
                    <div
                      key={fee._id}
                      style={{
                        ...styles.itemCard,
                        borderLeft: `4px solid ${isPaid ? "#10b981" : "#f59e0b"}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>
                          Semester Fee Invoice
                        </span>
                        <span
                          style={{
                            ...styles.statusBadge,
                            background: isPaid ? "#dcfce7" : "#fef3c7",
                            color: isPaid ? "#15803d" : "#b45309",
                            borderColor: isPaid ? "#86efac" : "#fde68a",
                          }}
                        >
                          {isPaid ? "PAID IN FULL 🎉" : "PAYMENT DUE ⏳"}
                        </span>
                      </div>

                      <div style={styles.feeBreakdown}>
                        <div>
                          <div style={styles.feeSubLabel}>Total Amount</div>
                          <div style={styles.feeSubVal}>₹{money(fee.totalAmount)}</div>
                        </div>
                        <div>
                          <div style={styles.feeSubLabel}>Paid Amount</div>
                          <div style={{ ...styles.feeSubVal, color: "#10b981" }}>₹{money(fee.paidAmount)}</div>
                        </div>
                        <div>
                          <div style={styles.feeSubLabel}>Remaining Due</div>
                          <div style={{ ...styles.feeSubVal, color: isPaid ? "#10b981" : "#ef4444" }}>
                            ₹{money(rem)}
                          </div>
                        </div>
                      </div>

                      <div style={{ ...styles.mentorFooter, marginTop: "12px" }}>
                        📅 Due Date: <strong>{formatDate(fee.dueDate)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================================================= */}
        {/* TAB 4: LEAVE REQUESTS */}
        {/* ================================================= */}
        {(activeTab === "ALL" || activeTab === "LEAVES") && (
          <section style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>📝 Leave & Absence Applications</h2>
                <p style={styles.sectionSubtitle}>Leave applications submitted by your ward</p>
              </div>
              <span style={styles.headerCount}>{leaveLetters.length} Requests</span>
            </div>

            {leaveLetters.length === 0 ? (
              <div style={styles.emptyBox}>
                <div style={styles.emptyIcon}>🏖️</div>
                <div style={styles.emptyTitle}>No Leave Applications</div>
                <div style={styles.emptyDesc}>Any leave requests applied by the student will be shown here.</div>
              </div>
            ) : (
              <div style={styles.recordGrid}>
                {leaveLetters.map((l) => {
                  const st = String(l.status || "").toUpperCase();
                  const isApproved = st === "APPROVED";
                  const isPending = st === "PENDING";

                  return (
                    <div
                      key={l._id}
                      style={{
                        ...styles.itemCard,
                        borderLeft: `4px solid ${
                          isApproved ? "#10b981" : isPending ? "#f59e0b" : "#ef4444"
                        }`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={styles.dateLabel}>
                          📅 {formatDate(l.fromDate)} → {formatDate(l.toDate)}
                        </span>
                        <span
                          style={{
                            ...styles.statusBadge,
                            background: isApproved ? "#dcfce7" : isPending ? "#fef3c7" : "#fee2e2",
                            color: isApproved ? "#15803d" : isPending ? "#b45309" : "#b91c1c",
                            borderColor: isApproved ? "#86efac" : isPending ? "#fde68a" : "#fca5a5",
                          }}
                        >
                          {st}
                        </span>
                      </div>
                      <div style={{ marginTop: "10px", fontSize: "14px", color: "#334155" }}>
                        <strong>Reason:</strong> {l.reason}
                      </div>
                      <div style={styles.mentorFooter}>
                        👨‍🏫 Mentor: {l.mentor?.name || "Assigned Mentor"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================================================= */}
        {/* TAB 5: CLASSROOM ISSUES */}
        {/* ================================================= */}
        {(activeTab === "ALL" || activeTab === "ISSUES") && (
          <section style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>🏫 Classroom & Campus Issues</h2>
                <p style={styles.sectionSubtitle}>Issues reported regarding classroom equipment & infrastructure</p>
              </div>
              <span style={styles.headerCount}>{issues.length} Reported</span>
            </div>

            {issues.length === 0 ? (
              <div style={styles.emptyBox}>
                <div style={styles.emptyIcon}>🛡️</div>
                <div style={styles.emptyTitle}>No Classroom Issues Reported</div>
                <div style={styles.emptyDesc}>Any reported classroom or lab issues will appear here.</div>
              </div>
            ) : (
              <div style={styles.recordGrid}>
                {issues.map((iss) => {
                  const isResolved = String(iss.status || "").toUpperCase() === "RESOLVED";

                  return (
                    <div
                      key={iss._id}
                      style={{
                        ...styles.itemCard,
                        borderLeft: `4px solid ${isResolved ? "#10b981" : "#f59e0b"}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={styles.examTag}>🏷️ {iss.issueType || "CLASSROOM ISSUE"}</span>
                        <span
                          style={{
                            ...styles.statusBadge,
                            background: isResolved ? "#dcfce7" : "#fef3c7",
                            color: isResolved ? "#15803d" : "#b45309",
                            borderColor: isResolved ? "#86efac" : "#fde68a",
                          }}
                        >
                          {isResolved ? "RESOLVED ✅" : "OPEN ⚠️"}
                        </span>
                      </div>
                      <div style={{ marginTop: "10px", fontSize: "14px", color: "#334155" }}>
                        {iss.description}
                      </div>
                      <div style={styles.mentorFooter}>
                        👨‍🏫 Mentor: {iss.mentor?.name || "Class In-Charge"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================================================= */}
        {/* TAB 6: TIMETABLE */}
        {/* ================================================= */}
        {(activeTab === "ALL" || activeTab === "TIMETABLE") && (
          <section style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>🗓️ Class Timetable & Schedule</h2>
                <p style={styles.sectionSubtitle}>Weekly period schedule for AIML-A section</p>
              </div>
              <span style={styles.headerCount}>{timetable.length} Periods</span>
            </div>

            {timetable.length === 0 ? (
              <div style={styles.emptyBox}>
                <div style={styles.emptyIcon}>🗓️</div>
                <div style={styles.emptyTitle}>No Timetable Available</div>
                <div style={styles.emptyDesc}>Timetable schedule will be visible once assigned by faculty.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {Object.entries(timetableByDay).map(([dayName, periods]) => {
                  if (periods.length === 0) return null;

                  return (
                    <div key={dayName} style={styles.dayGroupCard}>
                      <div style={styles.dayHeader}>
                        <span style={styles.dayTitle}>📅 {dayName}</span>
                        <span style={styles.dayPeriodCount}>{periods.length} Periods</span>
                      </div>
                      <div style={styles.periodRowGrid}>
                        {periods.map((p) => (
                          <div key={p._id} style={styles.periodMiniCard}>
                            <div style={styles.periodBadge}>P{p.period}</div>
                            <div style={styles.periodSubject}>{p.subject}</div>
                            <div style={styles.periodTime}>⏰ {p.startTime} - {p.endTime}</div>
                            {p.room && <div style={styles.periodRoom}>🏫 {p.room}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================================================= */}
        {/* TAB 7: MENTOR UPDATES & OBSERVATIONS */}
        {/* ================================================= */}
        {(activeTab === "ALL" || activeTab === "OBSERVATIONS") && (
          <section style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>👀 Mentor Updates & Academic Observations</h2>
                <p style={styles.sectionSubtitle}>Direct behavioral and academic performance remarks from assigned faculty mentor</p>
              </div>
              <span style={styles.headerCount}>{observations.length} Updates</span>
            </div>

            {observations.length === 0 ? (
              <div style={styles.emptyBox}>
                <div style={styles.emptyIcon}>📖</div>
                <div style={styles.emptyTitle}>No Mentor Remarks Recorded Yet</div>
                <div style={styles.emptyDesc}>Performance feedback and academic remarks shared by the mentor will appear here.</div>
              </div>
            ) : (
              <div style={styles.recordGrid}>
                {observations.map((obs) => {
                  const title = obs.title || obs.category || obs.observationType || "Academic Remark";
                  const text = obs.description || obs.observationText || obs.note || "";
                  const mentorName = obs.mentor?.name || "Assigned Mentor";

                  return (
                    <div key={obs._id} style={{ ...styles.itemCard, borderLeft: "4px solid #8b5cf6" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={styles.examTag}>🏷️ {title}</span>
                        <span style={styles.dateLabel}>🗓️ {formatDate(obs.date || obs.createdAt)}</span>
                      </div>
                      <div style={{ marginTop: "10px", fontSize: "14px", color: "#1e293b", lineHeight: 1.5 }}>
                        "{text}"
                      </div>
                      <div style={styles.mentorFooter}>
                        👨‍🏫 Recorded by: <strong>{mentorName}</strong> {obs.mentor?.email ? `(${obs.mentor.email})` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer style={styles.footer}>
          EduBridge Parent Portal • Connecting Parents with Classroom Progress 🎓
        </footer>
      </div>
    </div>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #f1f5f9 100%)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#0f172a",
    padding: "30px 20px",
    position: "relative",
    overflowX: "hidden",
  },
  glowOne: {
    position: "absolute",
    top: "-50px",
    left: "10%",
    width: "450px",
    height: "450px",
    background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0) 70%)",
    borderRadius: "50%",
    pointerEvents: "none",
  },
  glowTwo: {
    position: "absolute",
    top: "300px",
    right: "5%",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, rgba(236,72,153,0.1) 0%, rgba(236,72,153,0) 70%)",
    borderRadius: "50%",
    pointerEvents: "none",
  },
  container: {
    maxWidth: "1150px",
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "24px",
    background: "rgba(255, 255, 255, 0.85)",
    backdropFilter: "blur(16px)",
    padding: "24px 28px",
    borderRadius: "20px",
    boxShadow: "0 10px 30px -5px rgba(0,0,0,0.05), 0 0 0 1px rgba(255,255,255,0.7)",
  },
  brandBadge: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "12px",
    fontWeight: "800",
    color: "#4f46e5",
    letterSpacing: "0.5px",
    marginBottom: "4px",
  },
  roleBadge: {
    background: "#fce7f3",
    color: "#be185d",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
  },
  mainTitle: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "4px 0",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  refreshBtn: {
    padding: "10px 18px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
    transition: "all 0.15s ease",
  },
  logoutBtn: {
    padding: "10px 18px",
    borderRadius: "12px",
    border: "none",
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  studentCard: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    padding: "22px 26px",
    borderRadius: "20px",
    marginBottom: "24px",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.04), 0 0 0 1px rgba(99,102,241,0.15)",
  },
  studentAvatar: {
    width: "60px",
    height: "60px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    boxShadow: "0 8px 20px rgba(79, 70, 229, 0.3)",
    flexShrink: 0,
  },
  studentName: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "2px 0 8px",
  },
  studentMetaList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  metaChip: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#334155",
    background: "#f1f5f9",
    padding: "5px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    background: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(12px)",
    padding: "20px 22px",
    borderRadius: "16px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.03)",
  },
  statHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  statIcon: {
    fontSize: "18px",
  },
  statLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statValue: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "6px",
  },
  statFooter: {
    fontSize: "12px",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  tabContainer: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    paddingBottom: "8px",
    marginBottom: "24px",
  },
  tabBtn: {
    padding: "10px 16px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    background: "rgba(255, 255, 255, 0.8)",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
  },
  activeTabBtn: {
    background: "#4f46e5",
    color: "#ffffff",
    borderColor: "#4f46e5",
    boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
  },
  tabCount: {
    background: "#e2e8f0",
    color: "#334155",
    padding: "2px 7px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: "700",
  },
  activeTabCount: {
    background: "rgba(255, 255, 255, 0.25)",
    color: "#ffffff",
  },
  sectionCard: {
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(16px)",
    borderRadius: "20px",
    padding: "26px",
    marginBottom: "24px",
    boxShadow: "0 10px 30px -5px rgba(0,0,0,0.04)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "14px",
    borderBottom: "1px solid #f1f5f9",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 4px",
  },
  sectionSubtitle: {
    fontSize: "13px",
    color: "#64748b",
    margin: 0,
  },
  headerCount: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#6366f1",
    background: "#e0e7ff",
    padding: "4px 12px",
    borderRadius: "20px",
  },
  recordGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "16px",
  },
  itemCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px 18px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  cardMainTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 4px",
  },
  dateLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
  },
  statusBadge: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "4px 10px",
    borderRadius: "20px",
    border: "1px solid transparent",
  },
  reasonText: {
    marginTop: "10px",
    fontSize: "13px",
    color: "#475569",
    background: "#f8fafc",
    padding: "8px 12px",
    borderRadius: "8px",
  },
  mentorFooter: {
    marginTop: "12px",
    fontSize: "12px",
    color: "#64748b",
    borderTop: "1px dashed #f1f5f9",
    paddingTop: "8px",
  },
  examTag: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#6366f1",
    background: "#eef2ff",
    padding: "3px 8px",
    borderRadius: "6px",
    display: "inline-block",
  },
  scoreBadge: {
    fontSize: "14px",
    fontWeight: "800",
    padding: "4px 10px",
    borderRadius: "10px",
    display: "inline-block",
  },
  progressBarBg: {
    width: "100%",
    height: "6px",
    background: "#f1f5f9",
    borderRadius: "6px",
    margin: "12px 0 6px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: "6px",
    transition: "width 0.3s ease",
  },
  feeBreakdown: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
    marginTop: "14px",
    background: "#f8fafc",
    padding: "12px",
    borderRadius: "10px",
  },
  feeSubLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#64748b",
    marginBottom: "2px",
  },
  feeSubVal: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#0f172a",
  },
  dayGroupCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "16px",
  },
  dayHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  dayTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#1e293b",
  },
  dayPeriodCount: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
  },
  periodRowGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "10px",
  },
  periodMiniCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "10px 12px",
  },
  periodBadge: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#4f46e5",
    background: "#e0e7ff",
    padding: "2px 6px",
    borderRadius: "6px",
    display: "inline-block",
    marginBottom: "4px",
  },
  periodSubject: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "4px",
  },
  periodTime: {
    fontSize: "11px",
    color: "#64748b",
  },
  periodRoom: {
    fontSize: "11px",
    color: "#6366f1",
    fontWeight: "600",
  },
  emptyBox: {
    textAlign: "center",
    padding: "40px 20px",
    background: "#f8fafc",
    borderRadius: "16px",
    border: "1px dashed #cbd5e1",
  },
  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#334155",
    marginBottom: "4px",
  },
  emptyDesc: {
    fontSize: "13px",
    color: "#94a3b8",
  },
  alertBanner: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "12px 18px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "20px",
    border: "1px solid #fca5a5",
  },
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
    fontFamily: "'Inter', sans-serif",
  },
  loadingOrb: {
    width: "70px",
    height: "70px",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    boxShadow: "0 10px 25px rgba(236, 72, 153, 0.3)",
  },
  loader: {
    width: "36px",
    height: "36px",
    border: "4px solid #e2e8f0",
    borderTopColor: "#ec4899",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginTop: "14px",
  },
  footer: {
    textAlign: "center",
    fontSize: "12px",
    color: "#94a3b8",
    padding: "20px 0 10px",
  },
};

export default ParentDashboard;

