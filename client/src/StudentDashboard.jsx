import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function StudentDashboard() {
  const [user, setUser] = useState(null);

  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [fees, setFees] = useState([]);
  const [leaveLetters, setLeaveLetters] = useState([]);
  const [issues, setIssues] = useState([]);

  const [holidays, setHolidays] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [observations, setObservations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  const [issueForm, setIssueForm] = useState({
    issueType: "PROJECTOR",
    description: "",
  });

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") ||
      localStorage.getItem("loggedInUser") ||
      localStorage.getItem("student");

    if (!storedUser) {
      setMessage("Student login information not found.");
      setLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      loadStudentData(parsedUser);
    } catch (error) {
      console.error(error);
      setMessage("Unable to read student login data.");
      setLoading(false);
    }
  }, []);

  const studentId =
    user?._id ||
    user?.id ||
    user?.userId;

  async function getJson(url) {
    try {
      const response = await fetch(url);
      const text = await response.text();

      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Server returned invalid JSON");
      }

      if (!response.ok) {
        throw new Error(
          data?.message || `Request failed: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error("API ERROR:", url, error);
      return null;
    }
  }

  function extractRecords(data, key) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.records)) return data.records;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }

  async function loadStudentData(currentUser) {
    setLoading(true);
    setMessage("");

    const id =
      currentUser?._id ||
      currentUser?.id ||
      currentUser?.userId;

    if (!id) {
      setMessage("Student ID not found.");
      setLoading(false);
      return;
    }

    const branch = currentUser?.branch || "";
    const section = currentUser?.section || "";

    try {
      const requests = await Promise.all([
        getJson(`${API}/attendance/student/${id}`),
        getJson(`${API}/marks/student/${id}`),
        getJson(`${API}/fees/student/${id}`),
        getJson(`${API}/leave/student/${id}`),
        getJson(`${API}/issues/student/${id}`),
        getJson(`${API}/holidays`),
        branch && section
          ? getJson(
              `${API}/timetable/class/${encodeURIComponent(
                branch
              )}/${encodeURIComponent(section)}`
            )
          : Promise.resolve(null),
        getJson(`${API}/observations/student/${id}`),
      ]);

      const [
        attendanceData,
        marksData,
        feesData,
        leavesData,
        issuesData,
        holidaysData,
        timetableData,
        observationsData,
      ] = requests;

      const attendanceRecords = extractRecords(
        attendanceData,
        "attendance"
      );
      const marksRecords = extractRecords(
        marksData,
        "marks"
      );
      const feeRecords = extractRecords(
        feesData,
        "fees"
      );
      const leaveRecords = Array.isArray(leavesData)
        ? leavesData
        : leavesData?.leaveLetters ||
          leavesData?.leaves ||
          leavesData?.records ||
          leavesData?.data ||
          [];
      const issueRecords = extractRecords(
        issuesData,
        "issues"
      );
      const holidayRecords = extractRecords(
        holidaysData,
        "holidays"
      );
      const timetableRecords = extractRecords(
        timetableData,
        "timetable"
      );
      const observationRecords = extractRecords(
        observationsData,
        "observations"
      );

      console.log("STUDENT DASHBOARD DATA:", {
        attendance: attendanceRecords.length,
        marks: marksRecords.length,
        fees: feeRecords.length,
        leaves: leaveRecords.length,
        issues: issueRecords.length,
        holidays: holidayRecords.length,
        timetable: timetableRecords.length,
        observations: observationRecords.length,
      });

      setAttendance(attendanceRecords);
      setMarks(marksRecords);
      setFees(feeRecords);
      setLeaveLetters(leaveRecords);
      setIssues(issueRecords);
      setHolidays(holidayRecords);
      setTimetable(timetableRecords);
      setObservations(observationRecords);
    } catch (error) {
      console.error("STUDENT DASHBOARD ERROR:", error);
      setMessage(
        "Some academic data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  function refreshDashboard() {
    if (user) {
      loadStudentData(user);
    }
  }

  function handleLogout() {
    localStorage.removeItem("user");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("student");
    localStorage.removeItem("token");
    window.location.href = "/";
  }

  async function handleLeaveSubmit(event) {
    event.preventDefault();

    if (!studentId) {
      setMessage("Student ID not available.");
      return;
    }

    setLeaveSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student: studentId,
          fromDate: leaveForm.fromDate,
          toDate: leaveForm.toDate,
          reason: leaveForm.reason,
          branch: user?.branch,
          section: user?.section,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to submit leave"
        );
      }

      setMessage(
        data?.message ||
          "Leave request submitted successfully."
      );

      setLeaveForm({
        fromDate: "",
        toDate: "",
        reason: "",
      });

      setShowLeaveForm(false);

      await loadStudentData(user);
    } catch (error) {
      console.error(error);
      setMessage(
        error.message ||
          "Failed to submit leave request."
      );
    } finally {
      setLeaveSubmitting(false);
    }
  }

  async function handleIssueSubmit(event) {
    event.preventDefault();

    if (!studentId) {
      setMessage("Student ID not available.");
      return;
    }

    if (!issueForm.issueType || !issueForm.description.trim()) {
      setMessage("Please select issue type and enter description.");
      return;
    }

    setIssueSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student: studentId,
          issueType: issueForm.issueType,
          description: issueForm.description.trim(),
          branch: user?.branch || "",
          section: user?.section || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to report issue");
      }

      setMessage(data?.message || "Classroom issue reported successfully.");
      setIssueForm({
        issueType: "PROJECTOR",
        description: "",
      });
      setShowIssueForm(false);
      await loadStudentData(user);
    } catch (error) {
      console.error("REPORT ISSUE ERROR:", error);
      setMessage(error.message || "Failed to submit classroom issue.");
    } finally {
      setIssueSubmitting(false);
    }
  }

  const presentCount = useMemo(
    () =>
      attendance.filter(
        (item) =>
          String(item.status || "").toUpperCase() ===
          "PRESENT"
      ).length,
    [attendance]
  );

  const absentCount = useMemo(
    () =>
      attendance.filter(
        (item) =>
          String(item.status || "").toUpperCase() ===
          "ABSENT"
      ).length,
    [attendance]
  );

  const totalClasses = attendance.length;

  const attendancePercentage =
    totalClasses > 0
      ? ((presentCount / totalClasses) * 100).toFixed(1)
      : "0.0";

  const totalFee = useMemo(
    () =>
      fees.reduce(
        (sum, fee) =>
          sum + Number(fee.totalAmount || 0),
        0
      ),
    [fees]
  );

  const totalPaid = useMemo(
    () =>
      fees.reduce(
        (sum, fee) =>
          sum + Number(fee.paidAmount || 0),
        0
      ),
    [fees]
  );

  const totalRemaining = Math.max(
    totalFee - totalPaid,
    0
  );

  const overallMarksPercentage = useMemo(() => {
    const totalMax = marks.reduce(
      (sum, item) =>
        sum + Number(item.maxMarks || 0),
      0
    );

    const totalObtained = marks.reduce(
      (sum, item) =>
        sum + Number(item.marksObtained || 0),
      0
    );

    if (!totalMax) return "0.0";

    return ((totalObtained / totalMax) * 100).toFixed(1);
  }, [marks]);

  const groupedTimetable = useMemo(() => {
    const dayOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const result = {};
    dayOrder.forEach((d) => {
      result[d] = [];
    });

    timetable.forEach((item) => {
      const rawDay = item.day || "Other";
      const normalized =
        rawDay.charAt(0).toUpperCase() + rawDay.slice(1).toLowerCase();
      const day = dayOrder.includes(normalized) ? normalized : rawDay;

      if (!result[day]) {
        result[day] = [];
      }

      result[day].push(item);
    });

    Object.keys(result).forEach((day) => {
      result[day].sort(
        (a, b) =>
          Number(a.period || 0) -
          Number(b.period || 0)
      );
    });

    const activeDays = {};
    dayOrder.forEach((day) => {
      if (result[day] && result[day].length > 0) {
        activeDays[day] = result[day];
      }
    });

    Object.keys(result).forEach((day) => {
      if (!dayOrder.includes(day) && result[day].length > 0) {
        activeDays[day] = result[day];
      }
    });

    return activeDays;
  }, [timetable]);

  const holidayDates = useMemo(() => {
    const dates = new Set();

    holidays.forEach((holiday) => {
      const hDate = holiday.startDate || holiday.date;
      if (hDate) {
        try {
          dates.add(
            new Date(hDate)
              .toISOString()
              .slice(0, 10)
          );
        } catch {
          // ignore invalid date
        }
      }
    });

    return dates;
  }, [holidays]);

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlowOne} />
      <div style={styles.backgroundGlowTwo} />

      <div style={styles.container}>
        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <div style={styles.brand}>
              🎓 EduBridge
            </div>

            <div style={styles.subtitle}>
              Student Academic Portal
            </div>
          </div>

          <div style={styles.headerActions}>
            <button
              onClick={refreshDashboard}
              style={styles.refreshButton}
            >
              🔄 Refresh
            </button>

            <button
              onClick={handleLogout}
              style={styles.logoutButton}
            >
              🚪 Logout
            </button>
          </div>
        </header>

        {/* PROFILE */}
        <section style={styles.heroCard}>
          <div style={styles.avatar}>
            {(user?.name || "S")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={styles.welcome}>
              Welcome back,
            </div>

            <h1 style={styles.heroTitle}>
              {user?.name || "Student"} 👋
            </h1>

            <div style={styles.profileGrid}>
              <ProfileItem
                icon="📧"
                label="Email"
                value={user?.email || "N/A"}
              />

              <ProfileItem
                icon="🎓"
                label="Role"
                value={user?.role || "STUDENT"}
              />

              <ProfileItem
                icon="🏢"
                label="Branch"
                value={user?.branch || "N/A"}
              />

              <ProfileItem
                icon="📚"
                label="Section"
                value={user?.section || "N/A"}
              />
            </div>
          </div>
        </section>

        {/* MESSAGE */}
        {message && (
          <div
            style={{
              ...styles.message,
              ...(message.toLowerCase().includes(
                "success"
              )
                ? styles.successMessage
                : styles.errorMessage),
            }}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div style={styles.loadingCard}>
            <div style={styles.spinner}>⟳</div>
            <h2>Loading your dashboard...</h2>
            <p>
              Fetching attendance, marks, fees and
              academic updates.
            </p>
          </div>
        ) : (
          <>
            {/* SUMMARY */}
            <div style={styles.summaryGrid}>
              <SummaryCard
                icon="📅"
                title="Attendance"
                value={`${attendancePercentage}%`}
                subtitle={`${presentCount} present / ${totalClasses} classes`}
                accent="#2563eb"
              />

              <SummaryCard
                icon="📚"
                title="Marks"
                value={`${overallMarksPercentage}%`}
                subtitle={`${marks.length} examination records`}
                accent="#7c3aed"
              />

              <SummaryCard
                icon="💰"
                title="Fees Paid"
                value={`₹${totalPaid.toLocaleString()}`}
                subtitle={`Total ₹${totalFee.toLocaleString()}`}
                accent="#059669"
              />

              <SummaryCard
                icon="💳"
                title="Fee Due"
                value={`₹${totalRemaining.toLocaleString()}`}
                subtitle={
                  totalRemaining === 0
                    ? "Fully paid 🎉"
                    : "Amount remaining"
                }
                accent="#ea580c"
              />

              <SummaryCard
                icon="🎉"
                title="Holidays"
                value={holidays.length}
                subtitle="College holidays"
                accent="#db2777"
              />

              <SummaryCard
                icon="🗓️"
                title="Timetable"
                value={timetable.length}
                subtitle="Assigned periods"
                accent="#0891b2"
              />

              <SummaryCard
                icon="👀"
                title="Observations"
                value={observations.length}
                subtitle="Mentor observations"
                accent="#9333ea"
              />

              <SummaryCard
                icon="📝"
                title="Leaves"
                value={leaveLetters.length}
                subtitle="Leave requests"
                accent="#475569"
              />
            </div>

            {/* ATTENDANCE */}
            <Section
              title="📅 Attendance"
              subtitle="Your attendance history and average"
            >
              <div style={styles.infoGrid}>
                <InfoBox
                  label="Total Classes"
                  value={totalClasses}
                  icon="📚"
                />

                <InfoBox
                  label="Present"
                  value={presentCount}
                  icon="✅"
                />

                <InfoBox
                  label="Absent"
                  value={absentCount}
                  icon="❌"
                />

                <InfoBox
                  label="Average"
                  value={`${attendancePercentage}%`}
                  icon="📈"
                />
              </div>

              {attendance.length === 0 ? (
                <Empty text="No attendance records found." />
              ) : (
                attendance.map((record) => {
                  const st = String(record.status || "").toUpperCase();
                  const isPresent = st === "PRESENT";
                  const isLeave = st === "LEAVE";

                  return (
                    <RecordCard
                      key={record._id}
                      status={
                        isPresent
                          ? "success"
                          : isLeave
                          ? "leave"
                          : "danger"
                      }
                    >
                      <RecordHeader
                        title={
                          isPresent
                            ? "Present"
                            : isLeave
                            ? "Approved Leave"
                            : "Absent"
                        }
                        icon={
                          isPresent
                            ? "✅"
                            : isLeave
                            ? "🏖️"
                            : "❌"
                        }
                      />

                      <DataRow
                        label="Date"
                        value={formatDate(
                          record.date
                        )}
                      />

                      <DataRow
                        label="Status"
                        value={
                          isPresent
                            ? "PRESENT ✅"
                            : isLeave
                            ? "EXCUSED LEAVE 🏖️"
                            : "ABSENT ❌"
                        }
                      />

                      <DataRow
                        label="Reason"
                        value={
                          record.reason ||
                          (isPresent ? "Attended class" : "No reason provided")
                        }
                      />

                      <DataRow
                        label="Mentor"
                        value={
                          record.mentor?.name ||
                          "Assigned Mentor"
                        }
                      />
                    </RecordCard>
                  );
                })
              )}
            </Section>

            {/* MARKS */}
            <Section
              title="📚 Marks & Performance"
              subtitle="Your examination performance"
            >
              {marks.length === 0 ? (
                <Empty text="No marks records found." />
              ) : (
                marks.map((mark) => {
                  const percentage =
                    Number(mark.maxMarks) > 0
                      ? (
                          (Number(
                            mark.marksObtained
                          ) /
                            Number(
                              mark.maxMarks
                            )) *
                          100
                        ).toFixed(1)
                      : "0.0";

                  return (
                    <RecordCard key={mark._id}>
                      <RecordHeader
                        title={
                          mark.subject ||
                          "Subject"
                        }
                        icon="📚"
                      />

                      <div style={styles.markHero}>
                        <div>
                          <div
                            style={
                              styles.smallLabel
                            }
                          >
                            Score
                          </div>

                          <div
                            style={
                              styles.bigScore
                            }
                          >
                            {mark.marksObtained}
                            <span
                              style={
                                styles.scoreMax
                              }
                            >
                              {" "}
                              /{" "}
                              {mark.maxMarks}
                            </span>
                          </div>
                        </div>

                        <div
                          style={
                            styles.percentageBadge
                          }
                        >
                          {percentage}%
                        </div>
                      </div>

                      <DataRow
                        label="Exam"
                        value={
                          mark.exam ||
                          "Not specified"
                        }
                      />

                      <DataRow
                        label="Mentor"
                        value={
                          mark.mentor?.name ||
                          "Not available"
                        }
                      />
                    </RecordCard>
                  );
                })
              )}
            </Section>

            {/* FEES */}
            <Section
              title="💰 Fee Status"
              subtitle="Payment and pending fee details"
            >
              {fees.length === 0 ? (
                <Empty text="No fee records found." />
              ) : (
                fees.map((fee) => {
                  const remaining = Math.max(
                    Number(
                      fee.totalAmount || 0
                    ) -
                      Number(
                        fee.paidAmount || 0
                      ),
                    0
                  );

                  return (
                    <RecordCard key={fee._id}>
                      <RecordHeader
                        title="Fee Record"
                        icon="💰"
                      />

                      <div style={styles.feeGrid}>
                        <InfoBox
                          label="Total"
                          value={`₹${Number(
                            fee.totalAmount ||
                              0
                          ).toLocaleString()}`}
                          icon="💵"
                        />

                        <InfoBox
                          label="Paid"
                          value={`₹${Number(
                            fee.paidAmount ||
                              0
                          ).toLocaleString()}`}
                          icon="✅"
                        />

                        <InfoBox
                          label="Remaining"
                          value={`₹${remaining.toLocaleString()}`}
                          icon="⚠️"
                        />
                      </div>

                      <DataRow
                        label="Due Date"
                        value={formatDate(
                          fee.dueDate
                        )}
                      />

                      <DataRow
                        label="Status"
                        value={
                          fee.status ||
                          (remaining === 0
                            ? "PAID"
                            : "PENDING")
                        }
                      />
                    </RecordCard>
                  );
                })
              )}
            </Section>

            {/* HOLIDAYS */}
            <Section
              title="🎉 Holidays"
              subtitle="Holiday days are not counted as attendance"
            >
              <div style={styles.holidayNotice}>
                🏖️ On a holiday, there is no attendance
                requirement. These dates are shown separately
                from your attendance.
              </div>

              {holidays.length === 0 ? (
                <Empty text="No holidays added yet." />
              ) : (
                holidays.map((holiday) => (
                  <RecordCard
                    key={holiday._id}
                    status="holiday"
                  >
                    <RecordHeader
                      title={
                        holiday.name ||
                        holiday.title ||
                        "Holiday"
                      }
                      icon="🎉"
                    />

                    <div style={styles.datePill}>
                      📅{" "}
                      {formatDate(
                        holiday.startDate ||
                          holiday.date
                      )}

                      {holiday.endDate &&
                        String(
                          holiday.endDate
                        ).slice(0, 10) !==
                          String(
                            holiday.startDate ||
                              holiday.date
                          ).slice(0, 10) && (
                          <>
                            {" "}
                            →{" "}
                            {formatDate(
                              holiday.endDate
                            )}
                          </>
                        )}
                    </div>

                    {holiday.description && (
                      <p style={styles.description}>
                        {holiday.description}
                      </p>
                    )}
                  </RecordCard>
                ))
              )}
            </Section>

            {/* TIMETABLE */}
            <Section
              title="🗓️ Class Timetable"
              subtitle={`${user?.branch || ""} ${
                user?.section || ""
              }`}
            >
              {timetable.length === 0 ? (
                <Empty text="No timetable assigned for your class yet." />
              ) : (
                <div style={styles.timetableWrap}>
                  {Object.entries(
                    groupedTimetable
                  ).map(([day, periods]) => (
                    <div
                      key={day}
                      style={styles.dayBlock}
                    >
                      <div style={styles.dayTitle}>
                        {day}
                      </div>

                      {periods.map((item) => (
                        <div
                          key={item._id}
                          style={
                            styles.periodCard
                          }
                        >
                          <div
                            style={
                              styles.periodNumber
                            }
                          >
                            P{item.period}
                          </div>

                          <div
                            style={
                              styles.periodMain
                            }
                          >
                            <strong>
                              {item.subject ||
                                "Subject"}
                            </strong>

                            <span
                              style={
                                styles.periodTime
                              }
                            >
                              ⏰{" "}
                              {item.startTime ||
                                "--"}{" "}
                              -{" "}
                              {item.endTime ||
                                "--"}
                            </span>

                            <span
                              style={
                                styles.periodRoom
                              }
                            >
                              🏫 Room{" "}
                              {item.room ||
                                "N/A"}
                            </span>
                          </div>

                          <div
                            style={
                              styles.teacher
                            }
                          >
                            👨‍🏫{" "}
                            {item.teacher ||
                              item.mentor?.name ||
                              "Mentor"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* OBSERVATIONS */}
            <Section
              title="👀 Mentor Observations"
              subtitle="Classroom observations shared by your mentor"
            >
              {observations.length === 0 ? (
                <Empty text="No observations recorded yet." />
              ) : (
                observations.map(
                  (observation) => (
                    <RecordCard
                      key={observation._id}
                      status="observation"
                    >
                      <RecordHeader
                        title={
                          observation.title ||
                          "Classroom Observation"
                        }
                        icon="👀"
                      />

                      <div
                        style={
                          styles.observationMeta
                        }
                      >
                        <span>
                          🏷️{" "}
                          {observation.category ||
                            "GENERAL"}
                        </span>

                        <span>
                          🚦{" "}
                          {observation.priority ||
                            "MEDIUM"}
                        </span>

                        <span>
                          📅{" "}
                          {formatDate(
                            observation.date ||
                              observation.createdAt
                          )}
                        </span>
                      </div>

                      <p
                        style={
                          styles.observationText
                        }
                      >
                        {observation.description ||
                          "No description provided."}
                      </p>

                      <DataRow
                        label="Mentor"
                        value={
                          observation.mentor
                            ?.name ||
                          "Not available"
                        }
                      />
                    </RecordCard>
                  )
                )
              )}
            </Section>

            {/* LEAVES */}
            <Section
              title="📝 Leave Requests"
              subtitle="Apply for leave and track approval status"
            >
              <button
                type="button"
                onClick={() =>
                  setShowLeaveForm(
                    !showLeaveForm
                  )
                }
                style={
                  styles.primaryButton
                }
              >
                {showLeaveForm
                  ? "✖ Close Form"
                  : "➕ Apply Leave"}
              </button>

              {showLeaveForm && (
                <form
                  onSubmit={
                    handleLeaveSubmit
                  }
                  style={styles.leaveForm}
                >
                  <h3>Apply for Leave</h3>

                  <div style={styles.formGrid}>
                    <Field
                      label="From Date"
                      type="date"
                      value={
                        leaveForm.fromDate
                      }
                      onChange={(value) =>
                        setLeaveForm({
                          ...leaveForm,
                          fromDate: value,
                        })
                      }
                      required
                    />

                    <Field
                      label="To Date"
                      type="date"
                      value={
                        leaveForm.toDate
                      }
                      onChange={(value) =>
                        setLeaveForm({
                          ...leaveForm,
                          toDate: value,
                        })
                      }
                      required
                    />
                  </div>

                  <label
                    style={styles.label}
                  >
                    Reason
                  </label>

                  <textarea
                    value={
                      leaveForm.reason
                    }
                    onChange={(e) =>
                      setLeaveForm({
                        ...leaveForm,
                        reason:
                          e.target.value,
                      })
                    }
                    placeholder="Enter reason for leave"
                    rows={4}
                    required
                    style={
                      styles.textarea
                    }
                  />

                  <button
                    type="submit"
                    disabled={
                      leaveSubmitting
                    }
                    style={{
                      ...styles.successButton,
                      opacity:
                        leaveSubmitting
                          ? 0.6
                          : 1,
                    }}
                  >
                    {leaveSubmitting
                      ? "Submitting..."
                      : "Submit Leave Request"}
                  </button>
                </form>
              )}

              {leaveLetters.length ===
              0 ? (
                <Empty text="No leave requests found." />
              ) : (
                leaveLetters.map((leave) => (
                  <RecordCard
                    key={leave._id}
                    status={
                      String(
                        leave.status || ""
                      ).toUpperCase() ===
                      "APPROVED"
                        ? "success"
                        : String(
                            leave.status || ""
                          ).toUpperCase() ===
                          "REJECTED"
                        ? "danger"
                        : "pending"
                    }
                  >
                    <RecordHeader
                      title="Leave Request"
                      icon="📝"
                    />

                    <DataRow
                      label="From"
                      value={formatDate(
                        leave.fromDate
                      )}
                    />

                    <DataRow
                      label="To"
                      value={formatDate(
                        leave.toDate
                      )}
                    />

                    <DataRow
                      label="Reason"
                      value={
                        leave.reason ||
                        "Not provided"
                      }
                    />

                    <DataRow
                      label="Status"
                      value={getLeaveStatus(
                        leave.status
                      )}
                    />

                    <DataRow
                      label="Mentor"
                      value={
                        leave.mentor?.name ||
                        "Not available"
                      }
                    />
                  </RecordCard>
                ))
              )}
            </Section>

            {/* ISSUES */}
            <Section
              title="🏫 Classroom Issues"
              subtitle="Issues reported by you or your class"
            >
              <button
                type="button"
                onClick={() =>
                  setShowIssueForm(
                    !showIssueForm
                  )
                }
                style={
                  styles.primaryButton
                }
              >
                {showIssueForm
                  ? "✖ Close Form"
                  : "➕ Report Classroom Issue"}
              </button>

              {showIssueForm && (
                <form
                  onSubmit={handleIssueSubmit}
                  style={styles.leaveForm}
                >
                  <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Report a Classroom Issue</h3>

                  <div style={styles.formGrid}>
                    <div>
                      <label style={styles.label}>
                        Issue Type
                      </label>
                      <select
                        style={styles.input}
                        value={issueForm.issueType}
                        onChange={(e) =>
                          setIssueForm({
                            ...issueForm,
                            issueType: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="PROJECTOR">Projector / Lab Equipment</option>
                        <option value="INFRASTRUCTURE">Classroom Infrastructure</option>
                        <option value="ACADEMIC">Academic / Syllabus</option>
                        <option value="ATTENDANCE">Attendance Discrepancy</option>
                        <option value="DISCIPLINE">Discipline</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={styles.label}>
                        Description
                      </label>
                      <textarea
                        style={{
                          ...styles.input,
                          minHeight: "75px",
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                        value={issueForm.description}
                        onChange={(e) =>
                          setIssueForm({
                            ...issueForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Describe the problem in detail..."
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={issueSubmitting}
                    style={styles.submitButton}
                  >
                    {issueSubmitting
                      ? "Submitting..."
                      : "🚀 Submit Issue"}
                  </button>
                </form>
              )}

              {issues.length === 0 ? (
                <Empty text="No classroom issues reported." />
              ) : (
                issues.map((issue) => {
                  const isResolved =
                    String(issue.status || "").toUpperCase() === "RESOLVED";

                  return (
                    <RecordCard
                      key={issue._id}
                      status={isResolved ? "success" : "issue"}
                    >
                      <RecordHeader
                        title={
                          issue.issueType ||
                          "Classroom Issue"
                        }
                        icon="🏫"
                      />

                      <DataRow
                        label="Description"
                        value={
                          issue.description ||
                          "No description"
                        }
                      />

                      <DataRow
                        label="Status"
                        value={
                          isResolved ? "RESOLVED ✅" : "OPEN ⚠️"
                        }
                      />

                      <DataRow
                        label="Mentor"
                        value={
                          issue.mentor?.name ||
                          "Assigned Mentor"
                        }
                      />

                      <DataRow
                        label="Reported On"
                        value={
                          formatDate(issue.createdAt || issue.date)
                        }
                      />
                    </RecordCard>
                  );
                })
              )}
            </Section>

            {/* ACADEMIC SUMMARY */}
            <Section
              title="🎓 Academic Overview"
              subtitle="Quick view of your current academic standing"
            >
              <div style={styles.overviewGrid}>
                <OverviewItem
                  icon="📅"
                  label="Attendance"
                  value={`${attendancePercentage}%`}
                />

                <OverviewItem
                  icon="📚"
                  label="Marks"
                  value={`${overallMarksPercentage}%`}
                />

                <OverviewItem
                  icon="💰"
                  label="Fee Due"
                  value={`₹${totalRemaining.toLocaleString()}`}
                />

                <OverviewItem
                  icon="🎉"
                  label="Holidays"
                  value={holidays.length}
                />

                <OverviewItem
                  icon="🗓️"
                  label="Periods"
                  value={timetable.length}
                />

                <OverviewItem
                  icon="👀"
                  label="Observations"
                  value={observations.length}
                />
              </div>

              <div style={styles.footerNote}>
                ✨ Keep checking your dashboard regularly
                for mentor updates, attendance, marks,
                holidays and timetable changes.
              </div>
            </Section>
          </>
        )}

        <footer style={styles.footer}>
          <strong>🎓 EduBridge</strong>
          <span>
            Academic Management Portal • Student
            Workspace
          </span>
        </footer>
      </div>
    </div>
  );
}

/* =====================================================
   COMPONENTS
===================================================== */

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  accent,
}) {
  return (
    <div
      style={{
        ...styles.summaryCard,
        borderTop: `4px solid ${accent}`,
      }}
    >
      <div
        style={{
          ...styles.summaryIcon,
          background: `${accent}18`,
        }}
      >
        {icon}
      </div>

      <div style={styles.summaryTitle}>
        {title}
      </div>

      <div style={styles.summaryValue}>
        {value}
      </div>

      <div style={styles.summarySubtitle}>
        {subtitle}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>
            {title}
          </h2>

          {subtitle && (
            <p style={styles.sectionSubtitle}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

function RecordCard({
  children,
  status = "normal",
}) {
  const statusStyle =
    status === "success"
      ? styles.recordSuccess
      : status === "danger"
      ? styles.recordDanger
      : status === "holiday"
      ? styles.recordHoliday
      : status === "observation"
      ? styles.recordObservation
      : status === "issue"
      ? styles.recordIssue
      : status === "leave"
      ? styles.recordLeave
      : status === "pending"
      ? styles.recordPending
      : {};

  return (
    <div
      style={{
        ...styles.recordCard,
        ...statusStyle,
      }}
    >
      {children}
    </div>
  );
}

function RecordHeader({
  title,
  icon,
}) {
  return (
    <div style={styles.recordHeader}>
      <div style={styles.recordIcon}>
        {icon}
      </div>

      <h3 style={styles.recordTitle}>
        {title}
      </h3>
    </div>
  );
}

function DataRow({
  label,
  value,
}) {
  return (
    <div style={styles.dataRow}>
      <span style={styles.dataLabel}>
        {label}
      </span>

      <span style={styles.dataValue}>
        {value}
      </span>
    </div>
  );
}

function InfoBox({
  label,
  value,
  icon,
}) {
  return (
    <div style={styles.infoBox}>
      <div style={styles.infoIcon}>
        {icon}
      </div>

      <div>
        <small style={styles.infoLabel}>
          {label}
        </small>

        <strong style={styles.infoValue}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function ProfileItem({
  icon,
  label,
  value,
}) {
  return (
    <div style={styles.profileItem}>
      <span style={styles.profileIcon}>
        {icon}
      </span>

      <div>
        <small style={styles.profileLabel}>
          {label}
        </small>

        <div style={styles.profileValue}>
          {value}
        </div>
      </div>
    </div>
  );
}

function OverviewItem({
  icon,
  label,
  value,
}) {
  return (
    <div style={styles.overviewItem}>
      <span style={styles.overviewIcon}>
        {icon}
      </span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
}) {
  return (
    <div>
      <label style={styles.label}>
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        required={required}
        style={styles.input}
      />
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>
        📭
      </div>

      <div>{text}</div>
    </div>
  );
}

/* =====================================================
   HELPERS
===================================================== */

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function getLeaveStatus(status) {
  const value = String(
    status || "PENDING"
  ).toUpperCase();

  if (value === "APPROVED") {
    return "APPROVED ✅";
  }

  if (value === "REJECTED") {
    return "REJECTED ❌";
  }

  return "PENDING ⏳";
}

/* =====================================================
   STYLES
===================================================== */

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #eef2ff 0%, #f8fafc 45%, #ecfeff 100%)",
    padding: "25px 15px",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    color: "#0f172a",
  },

  backgroundGlowOne: {
    position: "fixed",
    width: "320px",
    height: "320px",
    borderRadius: "50%",
    background:
      "rgba(99,102,241,0.12)",
    top: "-120px",
    right: "-80px",
    filter: "blur(20px)",
    pointerEvents: "none",
  },

  backgroundGlowTwo: {
    position: "fixed",
    width: "280px",
    height: "280px",
    borderRadius: "50%",
    background:
      "rgba(6,182,212,0.10)",
    bottom: "-100px",
    left: "-80px",
    filter: "blur(20px)",
    pointerEvents: "none",
  },

  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
  },

  header: {
    background:
      "linear-gradient(135deg, #312e81, #4f46e5, #0891b2)",
    color: "white",
    padding: "24px",
    borderRadius: "24px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    boxShadow:
      "0 20px 50px rgba(49,46,129,0.25)",
  },

  brand: {
    fontSize: "28px",
    fontWeight: "900",
    letterSpacing: "-0.5px",
  },

  subtitle: {
    marginTop: "5px",
    opacity: 0.85,
    fontSize: "14px",
  },

  headerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  refreshButton: {
    border: "1px solid rgba(255,255,255,0.35)",
    background:
      "rgba(255,255,255,0.12)",
    color: "white",
    padding: "11px 16px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "700",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 16px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "700",
  },

  heroCard: {
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(15px)",
    padding: "28px",
    borderRadius: "24px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "22px",
    boxShadow:
      "0 15px 40px rgba(15,23,42,0.08)",
    border:
      "1px solid rgba(255,255,255,0.8)",
  },

  avatar: {
    width: "80px",
    height: "80px",
    borderRadius: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #4f46e5, #06b6d4)",
    color: "white",
    fontSize: "34px",
    fontWeight: "900",
    flexShrink: 0,
    boxShadow:
      "0 12px 25px rgba(79,70,229,0.25)",
  },

  welcome: {
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "700",
  },

  heroTitle: {
    margin: "3px 0 18px",
    fontSize: "30px",
  },

  profileGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
  },

  profileItem: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    padding: "10px",
    borderRadius: "12px",
    background: "#f8fafc",
  },

  profileIcon: {
    fontSize: "20px",
  },

  profileLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
  },

  profileValue: {
    fontWeight: "700",
    marginTop: "2px",
    wordBreak: "break-word",
  },

  message: {
    padding: "14px 18px",
    borderRadius: "14px",
    marginBottom: "20px",
    fontWeight: "700",
  },

  successMessage: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
  },

  errorMessage: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
  },

  loadingCard: {
    background: "white",
    padding: "60px 20px",
    borderRadius: "24px",
    textAlign: "center",
    boxShadow:
      "0 15px 40px rgba(15,23,42,0.08)",
  },

  spinner: {
    fontSize: "45px",
    color: "#4f46e5",
    animation:
      "spin 1s linear infinite",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "22px",
  },

  summaryCard: {
    background: "rgba(255,255,255,0.94)",
    padding: "20px",
    borderRadius: "20px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.07)",
    transition:
      "transform 0.25s ease, box-shadow 0.25s ease",
  },

  summaryIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    marginBottom: "14px",
  },

  summaryTitle: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "700",
  },

  summaryValue: {
    fontSize: "27px",
    fontWeight: "900",
    margin: "6px 0",
  },

  summarySubtitle: {
    color: "#94a3b8",
    fontSize: "12px",
  },

  section: {
    background: "rgba(255,255,255,0.94)",
    padding: "24px",
    borderRadius: "24px",
    marginBottom: "22px",
    boxShadow:
      "0 12px 35px rgba(15,23,42,0.07)",
    border:
      "1px solid rgba(226,232,240,0.8)",
  },

  sectionHeader: {
    marginBottom: "18px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "900",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    marginBottom: "18px",
  },

  feeGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },

  infoBox: {
    background:
      "linear-gradient(135deg, #f8fafc, #eef2ff)",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  infoIcon: {
    fontSize: "23px",
  },

  infoLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
  },

  infoValue: {
    display: "block",
    marginTop: "3px",
    fontSize: "18px",
  },

  recordCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "12px",
    transition:
      "transform 0.2s ease, box-shadow 0.2s ease",
  },

  recordSuccess: {
    borderLeft:
      "5px solid #16a34a",
  },

  recordDanger: {
    borderLeft:
      "5px solid #dc2626",
  },

  recordHoliday: {
    borderLeft:
      "5px solid #db2777",
    background:
      "linear-gradient(135deg, #fff1f2, #fdf2f8)",
  },

  recordObservation: {
    borderLeft:
      "5px solid #9333ea",
    background:
      "linear-gradient(135deg, #faf5ff, #f5f3ff)",
  },

  recordIssue: {
    borderLeft:
      "5px solid #ea580c",
  },

  recordLeave: {
    borderLeft:
      "5px solid #3b82f6",
    background:
      "linear-gradient(135deg, #eff6ff, #f8fafc)",
  },

  recordPending: {
    borderLeft:
      "5px solid #f59e0b",
  },

  recordHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "14px",
  },

  recordIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "0 3px 10px rgba(15,23,42,0.06)",
  },

  recordTitle: {
    margin: 0,
    fontSize: "17px",
  },

  dataRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    padding: "9px 0",
    borderBottom:
      "1px dashed #e2e8f0",
    flexWrap: "wrap",
  },

  dataLabel: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "700",
  },

  dataValue: {
    fontWeight: "700",
    textAlign: "right",
  },

  markHero: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "12px",
  },

  smallLabel: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },

  bigScore: {
    fontSize: "30px",
    fontWeight: "900",
    marginTop: "3px",
  },

  scoreMax: {
    color: "#64748b",
    fontSize: "18px",
  },

  percentageBadge: {
    background:
      "linear-gradient(135deg, #7c3aed, #4f46e5)",
    color: "white",
    fontWeight: "900",
    padding: "12px 16px",
    borderRadius: "14px",
    fontSize: "18px",
  },

  holidayNotice: {
    padding: "15px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg, #fff1f2, #fdf2f8)",
    border:
      "1px solid #fbcfe8",
    marginBottom: "16px",
    color: "#9d174d",
    fontWeight: "700",
  },

  datePill: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "#fce7f3",
    color: "#9d174d",
    fontWeight: "800",
    fontSize: "13px",
  },

  description: {
    color: "#475569",
    lineHeight: 1.6,
  },

  timetableWrap: {
    display: "grid",
    gap: "18px",
  },

  dayBlock: {
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    overflow: "hidden",
  },

  dayTitle: {
    padding: "14px 18px",
    background:
      "linear-gradient(135deg, #312e81, #4f46e5)",
    color: "white",
    fontWeight: "900",
    fontSize: "17px",
  },

  periodCard: {
    display: "grid",
    gridTemplateColumns:
      "55px minmax(180px, 1fr) minmax(120px, 180px)",
    gap: "14px",
    alignItems: "center",
    padding: "15px 18px",
    borderTop:
      "1px solid #e2e8f0",
    background: "white",
  },

  periodNumber: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "#eef2ff",
    color: "#4338ca",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
  },

  periodMain: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  periodTime: {
    fontSize: "12px",
    color: "#64748b",
  },

  periodRoom: {
    fontSize: "12px",
    color: "#475569",
  },

  teacher: {
    fontSize: "13px",
    color: "#475569",
    fontWeight: "700",
  },

  observationMeta: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },

  observationText: {
    fontSize: "15px",
    lineHeight: 1.7,
    color: "#334155",
  },

  primaryButton: {
    border: "none",
    background:
      "linear-gradient(135deg, #4f46e5, #2563eb)",
    color: "white",
    padding: "12px 18px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "800",
    marginBottom: "18px",
    boxShadow:
      "0 8px 20px rgba(79,70,229,0.2)",
  },

  successButton: {
    border: "none",
    background:
      "linear-gradient(135deg, #16a34a, #059669)",
    color: "white",
    padding: "12px 18px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "800",
    marginTop: "15px",
  },

  leaveForm: {
    padding: "20px",
    borderRadius: "18px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    marginBottom: "18px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
  },

  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "800",
    marginBottom: "7px",
    color: "#334155",
  },

  input: {
    width: "100%",
    padding: "11px 12px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "10px",
    boxSizing: "border-box",
    background: "white",
    fontSize: "14px",
  },

  textarea: {
    display: "block",
    width: "100%",
    padding: "12px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "10px",
    boxSizing: "border-box",
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: "14px",
  },

  overviewGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
  },

  overviewItem: {
    padding: "16px",
    borderRadius: "16px",
    background:
      "linear-gradient(135deg, #f8fafc, #eef2ff)",
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },

  overviewIcon: {
    fontSize: "25px",
  },

  footerNote: {
    marginTop: "18px",
    padding: "15px",
    borderRadius: "15px",
    background: "#f8fafc",
    color: "#64748b",
    textAlign: "center",
    fontSize: "13px",
  },

  empty: {
    padding: "30px 15px",
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "16px",
    border:
      "1px dashed #cbd5e1",
  },

  emptyIcon: {
    fontSize: "30px",
    marginBottom: "8px",
  },

  footer: {
    padding: "25px",
    textAlign: "center",
    color: "#64748b",
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
};

export default StudentDashboard;

