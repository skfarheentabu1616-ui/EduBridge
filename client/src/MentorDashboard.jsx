import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/*
  EduBridge Mentor Dashboard
  Existing modules:
  - Students
  - Attendance
  - Marks
  - Fees
  - Leaves
  - Classroom Issues
  - Academic PDF upload

  New modules:
  - Holidays
  - Timetable
  - Student Observations

  IMPORTANT:
  The new modules expect these backend routes:
    GET/POST    /api/holidays
    GET/POST    /api/timetable
    GET/POST    /api/observations

  If your backend uses different route names, change only
  HOLIDAY_API, TIMETABLE_API and OBSERVATION_API below.
*/

const HOLIDAY_API = `${API}/holidays`;
const TIMETABLE_API = `${API}/timetable`;
const OBSERVATION_API = `${API}/observations`;

function MentorDashboard({ user: propUser, onLogout }) {
  // =====================================================
  // USER
  // =====================================================

  const [user, setUser] = useState(() => {
    if (propUser) return propUser;
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // =====================================================
  // EXISTING DATA
  // =====================================================

  const [students, setStudents] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveFilter, setLeaveFilter] = useState("ALL");
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [issues, setIssues] = useState([]);
  const [marksRecords, setMarksRecords] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);

  // =====================================================
  // NEW DATA
  // =====================================================

  const [holidays, setHolidays] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [observations, setObservations] = useState([]);

  // =====================================================
  // GENERAL
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  // =====================================================
  // ATTENDANCE FORM
  // =====================================================

  const [attendanceStudent, setAttendanceStudent] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("PRESENT");
  const [attendanceReason, setAttendanceReason] = useState("");

  // =====================================================
  // MARKS FORM
  // =====================================================

  const [marksStudent, setMarksStudent] = useState("");
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("");
  const [marksObtained, setMarksObtained] = useState("");
  const [maximumMarks, setMaximumMarks] = useState("");

  // =====================================================
  // FEE FORM
  // =====================================================

  const [feeStudent, setFeeStudent] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  // =====================================================
  // HOLIDAY FORM
  // =====================================================

  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayEndDate, setHolidayEndDate] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");

  // =====================================================
  // TIMETABLE FORM
  // =====================================================

  const [ttDay, setTtDay] = useState("MONDAY");
  const [ttPeriod, setTtPeriod] = useState("1");
  const [ttSubject, setTtSubject] = useState("");
  const [ttStartTime, setTtStartTime] = useState("");
  const [ttEndTime, setTtEndTime] = useState("");
  const [ttRoom, setTtRoom] = useState("");
  const [ttTeacher, setTtTeacher] = useState("");

  // =====================================================
  // OBSERVATION FORM
  // =====================================================

  const [observationStudent, setObservationStudent] = useState("");
  const [observationType, setObservationType] = useState("GENERAL");
  const [observationText, setObservationText] = useState("");
  const [observationDate, setObservationDate] = useState("");

  // =====================================================
  // PDF FORM
  // =====================================================

  const [pdfType, setPdfType] = useState("attendance");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // =====================================================
  // ISSUE FORM
  // =====================================================

  const [issueStudent, setIssueStudent] = useState("");
  const [issueType, setIssueType] = useState("PROJECTOR");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);

  // =====================================================
  // AUTH HEADERS & HELPERS
  // =====================================================

  const getHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    };
  };

  const showMessage = (text) => {
    setMessage(text);

    window.clearTimeout(showMessage.timer);

    showMessage.timer = window.setTimeout(() => {
      setMessage("");
    }, 4000);
  };

  const getId = (value) => {
    if (!value) return "";

    if (typeof value === "object") {
      return value._id || value.id || "";
    }

    return String(value);
  };

  const getStudentName = (id) => {
    const student = students.find(
      (item) => String(item._id) === String(getId(id))
    );

    return student?.name || "Unknown Student";
  };

  const formatDate = (date) => {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "-";
    }

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const money = (value) =>
    Number(value || 0).toLocaleString("en-IN");

  const safeGet = async (url) => {
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  };

  // =====================================================
  // LOAD ALL DATA ORCHESTRATION
  // =====================================================

  const loadStudents = async (currentUser = user) => {
    try {
      let records = [];
      const response = await fetch(`${API}/auth/students`);
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        records = data;
      }

      setStudents(records);
      return records;
    } catch (error) {
      console.error("LOAD STUDENTS ERROR:", error);
      setStudents([]);
      return [];
    }
  };

  const loadAttendance = async (currentUser = user) => {
    const mentorId =
      currentUser?._id ||
      currentUser?.id ||
      currentUser?.userId ||
      currentUser?.mentorId;
    if (!mentorId) return;

    try {
      const data = await safeGet(
        `${API}/attendance/mentor/${mentorId}`
      );

      setAttendanceRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("LOAD ATTENDANCE ERROR:", error);
      setAttendanceRecords([]);
    }
  };

  const loadMarks = async (studentList = students, currentUser = user) => {
    try {
      const data = await safeGet(`${API}/marks`);
      let records = Array.isArray(data) ? data : [];
      const mentorId = currentUser?._id || currentUser?.id;

      if (mentorId) {
        records = records.filter(
          (item) =>
            String(getId(item.mentor)) === String(mentorId)
        );
      }

      if (studentList && studentList.length > 0) {
        const ids = studentList.map((student) => String(student._id));
        records = records.filter((item) =>
          ids.includes(String(getId(item.student)))
        );
      }

      setMarksRecords(records);
    } catch (error) {
      console.error("LOAD MARKS ERROR:", error);
      setMarksRecords([]);
    }
  };

  const loadFees = async (studentList = students) => {
    try {
      const data = await safeGet(`${API}/fees`);
      let records = Array.isArray(data) ? data : [];

      if (studentList && studentList.length > 0) {
        const ids = studentList.map((student) => String(student._id));
        records = records.filter((item) =>
          ids.includes(String(getId(item.student)))
        );
      }

      setFeeRecords(records);
    } catch (error) {
      console.error("LOAD FEES ERROR:", error);
      setFeeRecords([]);
    }
  };

  const loadLeaves = async (studentList = students, currentUser = user) => {
    try {
      const mentorId = currentUser?._id || currentUser?.id;
      let records = [];

      if (mentorId) {
        try {
          const mentorData = await safeGet(`${API}/leave/mentor/${mentorId}`);
          if (Array.isArray(mentorData) && mentorData.length > 0) {
            records = mentorData;
          }
        } catch (e) {
          // fallback
        }
      }

      if (records.length === 0) {
        const data = await safeGet(`${API}/leave`);
        const allLeaves = Array.isArray(data?.leaveLetters)
          ? data.leaveLetters
          : Array.isArray(data?.leaves)
          ? data.leaves
          : Array.isArray(data)
          ? data
          : [];

        if (studentList && studentList.length > 0) {
          const studentIds = studentList.map((student) =>
            String(student._id)
          );

          records = allLeaves.filter((leave) =>
            studentIds.includes(String(getId(leave.student)))
          );
        } else {
          records = allLeaves;
        }
      }

      setLeaveRequests(records);
    } catch (error) {
      console.error("LOAD LEAVES ERROR:", error);
      setLeaveRequests([]);
    }
  };

  const loadIssues = async (currentUser = user) => {
    try {
      const mentorId = currentUser?._id || currentUser?.id;
      let records = [];

      if (mentorId) {
        try {
          const mentorData = await safeGet(`${API}/issues/mentor/${mentorId}`);
          if (Array.isArray(mentorData) && mentorData.length > 0) {
            records = mentorData;
          } else if (Array.isArray(mentorData?.issues)) {
            records = mentorData.issues;
          }
        } catch (e) {
          // fallback
        }
      }

      if (records.length === 0) {
        const data = await safeGet(`${API}/issues`);
        records = Array.isArray(data?.issues)
          ? data.issues
          : Array.isArray(data)
          ? data
          : [];
      }

      setIssues(records);
    } catch (error) {
      console.error("LOAD ISSUES ERROR:", error);
      setIssues([]);
    }
  };

  const loadHolidays = async () => {
    try {
      const data = await safeGet(HOLIDAY_API);
      setHolidays(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("Holiday route not available yet:", error.message);
      setHolidays([]);
    }
  };

  const loadTimetable = async (currentUser = user) => {
    const branch = currentUser?.branch || "AIML";
    const section = currentUser?.section || "AIML-A";

    try {
      const b = encodeURIComponent(branch);
      const s = encodeURIComponent(section);

      const data = await safeGet(
        `${API}/timetable/class/${b}/${s}`
      );

      const records = Array.isArray(data?.timetable)
        ? data.timetable
        : Array.isArray(data)
        ? data
        : [];

      setTimetable(records);
    } catch (error) {
      console.warn("Timetable load failed:", error.message);
      setTimetable([]);
    }
  };

  const loadObservations = async (studentList = students) => {
    try {
      const data = await safeGet(
        `${OBSERVATION_API}`
      );

      let records = Array.isArray(data)
        ? data
        : data?.observations ||
          data?.records ||
          data?.data ||
          [];

      if (studentList && studentList.length > 0) {
        const studentIds = studentList.map(
          (student) => String(student._id || student.id || student)
        );

        records = records.filter((item) =>
          studentIds.includes(
            String(getId(item.student))
          )
        );
      }

      setObservations(records);
      return records;
    } catch (error) {
      console.error(
        "LOAD OBSERVATIONS ERROR:",
        error
      );
      setObservations([]);
      return [];
    }
  };

  const loadAllData = async (currentUser = user) => {
    try {
      setLoading(true);

      const studentList = await loadStudents(currentUser);

      await Promise.allSettled([
        loadAttendance(currentUser),
        loadMarks(studentList || [], currentUser),
        loadFees(studentList || []),
        loadLeaves(studentList || [], currentUser),
        loadIssues(currentUser),
        loadHolidays(),
        loadTimetable(currentUser),
        loadObservations(studentList || []),
      ]);
    } catch (err) {
      console.error("LOAD ALL DATA ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const currentUser = propUser || (() => {
        try {
          const stored = localStorage.getItem("user");
          return stored ? JSON.parse(stored) : null;
        } catch {
          return null;
        }
      })();

      if (currentUser) {
        setUser(currentUser);
        loadAllData(currentUser);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to read user:", error);
      setLoading(false);
    }
  }, [propUser]);

  // =====================================================
  // ATTENDANCE
  // =====================================================

  const handleMarkAttendance = async (event) => {
    event.preventDefault();

    if (!attendanceStudent || !attendanceDate || !attendanceStatus) {
      showMessage("Please fill all attendance fields ❌");
      return;
    }

    const mentorId =
      user?._id ||
      user?.id ||
      user?.userId ||
      user?.mentorId;

    if (!mentorId) {
      showMessage("Mentor session not found. Please log in again. ❌");
      return;
    }

    try {
      const response = await fetch(`${API}/attendance/mark`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          student: attendanceStudent,
          mentor: mentorId,
          date: attendanceDate,
          status: attendanceStatus,
          reason: attendanceReason || "",
        }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        // non-JSON response fallback
      }

      if (!response.ok) {
        throw new Error(data.message || `Failed to mark attendance (HTTP ${response.status})`);
      }

      showMessage(data.message || "Attendance recorded successfully ✅");

      setAttendanceStudent("");
      setAttendanceDate("");
      setAttendanceStatus("PRESENT");
      setAttendanceReason("");

      await loadAttendance(user);
    } catch (error) {
      console.error("ATTENDANCE ERROR:", error);
      showMessage(`${error.message} ❌`);
    }
  };

  // =====================================================
  // MARKS
  // =====================================================

  const handleAddMarks = async (event) => {
    event.preventDefault();

    if (
      !marksStudent ||
      !subject ||
      !exam ||
      marksObtained === "" ||
      maximumMarks === ""
    ) {
      showMessage("Please fill all marks fields ❌");
      return;
    }

    const obtained = Number(marksObtained);
    const maximum = Number(maximumMarks);

    if (
      maximum <= 0 ||
      obtained < 0 ||
      obtained > maximum
    ) {
      showMessage("Invalid marks ❌");
      return;
    }

    const mentorId =
      user?._id ||
      user?.id ||
      user?.userId ||
      user?.mentorId;

    if (!mentorId) {
      showMessage("Mentor session not found. Please log in again. ❌");
      return;
    }

    try {
      const response = await fetch(`${API}/marks`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          student: marksStudent,
          mentor: mentorId,
          subject,
          exam,
          marksObtained: obtained,
          maxMarks: maximum,
        }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        // non-JSON response fallback
      }

      if (!response.ok) {
        throw new Error(
          data.message || `Failed to add marks (HTTP ${response.status})`
        );
      }

      showMessage(data.message || "Marks added successfully ✅");

      setMarksStudent("");
      setSubject("");
      setExam("");
      setMarksObtained("");
      setMaximumMarks("");

      await loadMarks(students, user);
    } catch (error) {
      console.error("ADD MARKS ERROR:", error);
      showMessage(`${error.message} ❌`);
    }
  };

  // =====================================================
  // FEES
  // =====================================================

  const handleAddFee = async (event) => {
    event.preventDefault();

    if (
      !feeStudent ||
      totalAmount === "" ||
      !dueDate
    ) {
      showMessage("Please fill all fee fields ❌");
      return;
    }

    const total = Number(totalAmount);
    const paid = Number(paidAmount || 0);

    if (
      total < 0 ||
      paid < 0 ||
      paid > total
    ) {
      showMessage("Invalid fee amount ❌");
      return;
    }

    try {
      const response = await fetch(`${API}/fees`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          student: feeStudent,
          totalAmount: total,
          paidAmount: paid,
          dueDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to add fee"
        );
      }

      showMessage("Fee added successfully ✅");

      setFeeStudent("");
      setTotalAmount("");
      setPaidAmount("");
      setDueDate("");

      loadFees();
    } catch (error) {
      console.error(error);
      showMessage(`${error.message} ❌`);
    }
  };

  const handleUpdatePayment = async (fee) => {
    const newPaid = window.prompt(
      "Enter updated paid amount:",
      String(fee.paidAmount ?? 0)
    );

    if (newPaid === null) return;

    const paid = Number(newPaid);
    const total = Number(fee.totalAmount);

    if (
      Number.isNaN(paid) ||
      paid < 0 ||
      paid > total
    ) {
      showMessage("Invalid payment amount ❌");
      return;
    }

    try {
      const response = await fetch(
        `${API}/fees/${fee._id}`,
        {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({
            paidAmount: paid,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update payment"
        );
      }

      showMessage("Payment updated successfully ✅");
      loadFees();
    } catch (error) {
      console.error(error);
      showMessage(`${error.message} ❌`);
    }
  };

  // =====================================================
  // HOLIDAY
  // =====================================================

  const handleAddHoliday = async (event) => {
    event.preventDefault();

    if (!holidayName || !holidayDate) {
      showMessage("Holiday name and date are required ❌");
      return;
    }

    try {
      const response = await fetch(HOLIDAY_API, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: holidayName,
          title: holidayName,
          date: holidayDate,
          startDate: holidayDate,
          endDate: holidayEndDate || holidayDate,
          description: holidayDescription,
          branch: user?.branch || "",
          section: user?.section || "",
          createdBy: user?.id,
          mentor: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to add holiday"
        );
      }

      showMessage("Holiday added successfully 🎉");

      setHolidayName("");
      setHolidayDate("");
      setHolidayEndDate("");
      setHolidayDescription("");

      loadHolidays();
    } catch (error) {
      console.error(error);
      showMessage(
        `${error.message}. Check /api/holidays route ❌`
      );
    }
  };

  // =====================================================
  // TIMETABLE
  // =====================================================

  const handleAddTimetable = async (event) => {
    event.preventDefault();

    if (!ttDay || !ttSubject || !ttStartTime || !ttEndTime) {
      showMessage("Fill day, subject and time fields ❌");
      return;
    }

    try {
      const response = await fetch(TIMETABLE_API, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          day: ttDay,
          period: Number(ttPeriod),
          subject: ttSubject,
          startTime: ttStartTime,
          endTime: ttEndTime,
          room: ttRoom,
          teacher: ttTeacher || user?.name || "",
          mentor: user?.id || user?._id,
          branch: user?.branch || "",
          section: user?.section || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save timetable"
        );
      }

      showMessage("Timetable entry assigned successfully 🗓️");

      setTtPeriod("1");
      setTtSubject("");
      setTtStartTime("");
      setTtEndTime("");
      setTtRoom("");
      setTtTeacher("");

      loadTimetable();
    } catch (error) {
      console.error(error);
      showMessage(
        `${error.message}. Check /api/timetable route ❌`
      );
    }
  };

  const handleDeleteTimetable = async (timetableId) => {
    if (!timetableId) return;

    try {
      const response = await fetch(`${TIMETABLE_API}/${timetableId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete timetable entry");
      }

      showMessage("Timetable period deleted 🗑️");
      loadTimetable();
    } catch (error) {
      console.error("DELETE TIMETABLE ERROR:", error);
      showMessage(`${error.message} ❌`);
    }
  };

  // =====================================================
  // OBSERVATION
  // ===================================================
  const handleAddObservation = async (event) => {
    event.preventDefault();

    const mentorId = user?._id || user?.id || user?.userId;

    // Check mentor
    if (!mentorId) {
      showMessage("Mentor information not found ❌");
      return;
    }

    // Check student
    if (!observationStudent) {
      showMessage("Please select a student ❌");
      return;
    }

    // Check observation
    if (!observationText.trim()) {
      showMessage("Please enter an observation ❌");
      return;
    }

    // Create title from observation type
    const titleMap = {
      GENERAL: "Classroom Observation",
      BOOK: "Forgot / Missing Book",
      HOMEWORK: "Homework Observation",
      BEHAVIOUR: "Behaviour Observation",
      PARTICIPATION: "Classroom Participation",
      PERFORMANCE: "Performance Observation",
      DISCIPLINE: "Discipline Observation",
    };

    const title =
      titleMap[observationType] ||
      (observationType ? `${observationType} Observation` : "Classroom Observation");

    try {
      const response = await fetch(OBSERVATION_API, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          student: observationStudent,
          mentor: mentorId,
          title: title,
          description: observationText.trim(),
          category: observationType || "GENERAL",
          priority: "MEDIUM",
          date: observationDate
            ? new Date(observationDate).toISOString()
            : new Date().toISOString(),
        }),
      });

      // Safely read response
      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          text || "Server returned an invalid response"
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to save observation"
        );
      }

      showMessage(
        "Student observation saved successfully 👀"
      );

      // Clear form
      setObservationStudent("");
      setObservationType("GENERAL");
      setObservationText("");
      setObservationDate("");

      // Reload observations
      await loadObservations(students);

    } catch (error) {
      console.error(
        "SAVE OBSERVATION ERROR:",
        error
      );

      showMessage(
        error.message ||
          "Failed to save observation ❌"
      );
    }
  };

  // =====================================================
  // CLASSROOM ISSUES
  // =====================================================

  const handleCreateIssue = async (event) => {
    event.preventDefault();

    if (!issueStudent || !issueType || !issueDescription) {
      showMessage("Please select student, type and enter description ❌");
      return;
    }

    setIssueLoading(true);

    try {
      const response = await fetch(`${API}/issues`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          student: issueStudent,
          mentor: user?.id || user?._id,
          issueType,
          description: issueDescription,
          status: "OPEN",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to report issue");
      }

      showMessage("Classroom issue reported successfully 🏫");
      setIssueStudent("");
      setIssueDescription("");
      setIssueType("PROJECTOR");

      loadIssues();
    } catch (error) {
      console.error("CREATE ISSUE ERROR:", error);
      showMessage(`${error.message} ❌`);
    } finally {
      setIssueLoading(false);
    }
  };

  const handleUpdateIssueStatus = async (issueId, newStatus) => {
    try {
      const response = await fetch(`${API}/issues/${issueId}/status`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update issue status");
      }

      showMessage(`Issue status updated to ${newStatus} ✅`);
      loadIssues();
    } catch (error) {
      console.error("UPDATE ISSUE ERROR:", error);
      showMessage(`${error.message} ❌`);
    }
  };

  // =====================================================
  // LEAVE STATUS HANDLER
  // =====================================================

  const handleUpdateLeaveStatus = async (leaveId, newStatus) => {
    try {
      const response = await fetch(`${API}/leave/${leaveId}/status`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update leave status");
      }

      showMessage(`Leave request marked as ${newStatus} ✅`);
      loadLeaves();
    } catch (error) {
      console.error("UPDATE LEAVE STATUS ERROR:", error);
      showMessage(`${error.message} ❌`);
    }
  };

  // =====================================================
  // PDF UPLOAD
  // =====================================================

  const handlePdfUpload = async (event) => {
    event.preventDefault();

    if (!pdfFile) {
      showMessage("Please select a PDF file ❌");
      return;
    }

    try {
      setPdfLoading(true);
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("section", user?.section || "AIML-A");
      formData.append("branch", user?.branch || "AIML");

      const endpoint =
        pdfType === "attendance"
          ? `${API}/pdf/attendance`
          : pdfType === "marks"
          ? `${API}/pdf/marks`
          : `${API}/pdf/fees`;

      const token = localStorage.getItem("token");
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to process PDF");
      }

      setPdfPreview({
        fileName: data.fileName || pdfFile.name,
        pageCount: data.pageCount || 1,
        text: data.text || "",
        type: data.type || pdfType,
      });

      showMessage(`${data.message || "PDF processed successfully"} ✅`);
    } catch (error) {
      console.error("PDF UPLOAD ERROR:", error);
      showMessage(`${error.message} ❌`);
    } finally {
      setPdfLoading(false);
    }
  };
  // =====================================================
  // ATTENDANCE SUMMARY
  // =====================================================

  const attendanceSummary = useMemo(() => {
    const summary = {};

    students.forEach((student) => {
      const records = attendanceRecords.filter(
        (record) =>
          String(getId(record.student)) ===
          String(student._id)
      );

      const total = records.length;

      const present = records.filter(
        (record) =>
          String(record.status).toUpperCase() === "PRESENT"
      ).length;

      const absent = records.filter(
        (record) =>
          String(record.status).toUpperCase() === "ABSENT"
      ).length;

      const percentage =
        total > 0
          ? ((present / total) * 100).toFixed(1)
          : "0.0";

      summary[student._id] = {
        total,
        present,
        absent,
        percentage,
      };
    });

    return summary;
  }, [students, attendanceRecords]);

  // =====================================================
  // DASHBOARD STATS
  // =====================================================

  const dashboardStats = useMemo(() => {
    const totalAttendance = attendanceRecords.length;

    const present = attendanceRecords.filter(
      (item) =>
        String(item.status).toUpperCase() === "PRESENT"
    ).length;

    const attendancePercent =
      totalAttendance > 0
        ? ((present / totalAttendance) * 100).toFixed(1)
        : "0.0";

    const totalFee = feeRecords.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0),
      0
    );

    const paidFee = feeRecords.reduce(
      (sum, item) => sum + Number(item.paidAmount || 0),
      0
    );

    const feePercent =
      totalFee > 0
        ? Math.min((paidFee / totalFee) * 100, 100).toFixed(1)
        : "0.0";

    return {
      totalAttendance,
      present,
      absent: Math.max(totalAttendance - present, 0),
      attendancePercent,
      totalFee,
      paidFee,
      dueFee: Math.max(totalFee - paidFee, 0),
      feePercent,
    };
  }, [attendanceRecords, feeRecords]);

  // =====================================================
  // WEEKDAY TIMETABLE
  // =====================================================

  const days = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];

  const timetableByDay = useMemo(() => {
    const grouped = {};

    days.forEach((day) => {
      grouped[day] = timetable
        .filter(
          (item) =>
            String(item.day || "").toUpperCase() === day
        )
        .sort(
          (a, b) =>
            Number(a.period || 0) -
            Number(b.period || 0)
        );
    });

    return grouped;
  }, [timetable]);

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
        <div style={styles.loadingOrb}>🎓</div>
        <h1>EduBridge</h1>
        <div style={styles.loader} />
        <p>Loading Mentor Dashboard...</p>
        <small>Preparing your classroom workspace ✨</small>
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
        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <div style={styles.brand}>🎓 EDUBRIDGE</div>
            <h1 style={styles.title}>Mentor Dashboard</h1>

            <p style={styles.subtitle}>
              Welcome back,{" "}
              <strong>{user?.name || "Mentor"}</strong> 👋
            </p>

            <div style={styles.pills}>
              <span style={styles.pill}>
                📧 {user?.email || "-"}
              </span>
              <span style={styles.pill}>
                🏢 {user?.branch || "-"}
              </span>
              <span style={styles.pill}>
                📚 {user?.section || "-"}
              </span>
            </div>
          </div>

          <div style={styles.headerButtons}>
            <button
              style={styles.refreshButton}
              disabled={refreshing}
              onClick={() => {
                loadAllData(user);
                showMessage("Dashboard refreshed 🔄");
              }}
            >
              {refreshing ? "⏳ Refreshing..." : "🔄 Refresh"}
            </button>

            <button
              style={styles.logoutButton}
              onClick={handleLogout}
            >
              🚪 Logout
            </button>
          </div>
        </header>

        {message && (
          <div style={styles.message}>
            ✨ {message}
          </div>
        )}

        {/* QUICK STATS */}
        <div style={styles.statGrid}>
          <StatCard
            icon="👨‍🎓"
            label="Students"
            value={students.length}
            tone="purple"
          />
          <StatCard
            icon="📅"
            label="Attendance"
            value={`${dashboardStats.attendancePercent}%`}
            tone="blue"
          />
          <StatCard
            icon="📚"
            label="Marks Records"
            value={marksRecords.length}
            tone="pink"
          />
          <StatCard
            icon="💰"
            label="Fees"
            value={`₹${money(dashboardStats.paidFee)}`}
            tone="green"
          />
          <StatCard
            icon="🎉"
            label="Holidays"
            value={holidays.length}
            tone="orange"
          />
          <StatCard
            icon="🗓️"
            label="Timetable"
            value={timetable.length}
            tone="cyan"
          />
          <StatCard
            icon="👀"
            label="Observations"
            value={observations.length}
            tone="red"
          />
          <StatCard
            icon="🏫"
            label="Issues"
            value={issues.length}
            tone="indigo"
          />
        </div>

        {/* STUDENTS */}
        <Section
          icon="👨‍🎓"
          title={`${user?.section || "Section"} Students`}
          subtitle="Your assigned students and their attendance average"
        >
          {students.length === 0 ? (
            <Empty text="No students found." icon="👨‍🎓" />
          ) : (
            <div style={styles.studentGrid}>
              {students.map((student) => {
                const summary =
                  attendanceSummary[student._id] || {};

                return (
                  <div
                    key={student._id}
                    style={styles.studentCard}
                  >
                    <div style={styles.studentTop}>
                      <div style={styles.avatar}>
                        🎓
                      </div>

                      <div style={styles.attendanceBadge}>
                        {summary.percentage || "0.0"}%
                      </div>
                    </div>

                    <h3>{student.name}</h3>

                    <p style={styles.muted}>
                      📧 {student.email}
                    </p>

                    <div style={styles.studentInfo}>
                      <span>Branch</span>
                      <strong>
                        {student.branch || user?.branch || "-"}
                      </strong>
                    </div>

                    <div style={styles.studentInfo}>
                      <span>Section</span>
                      <strong>
                        {student.section || user?.section || "-"}
                      </strong>
                    </div>

                    <div style={styles.miniStats}>
                      <MiniStat
                        label="Present"
                        value={summary.present || 0}
                      />
                      <MiniStat
                        label="Absent"
                        value={summary.absent || 0}
                      />
                      <MiniStat
                        label="Total"
                        value={summary.total || 0}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ANALYTICS */}
        <Section
          icon="📈"
          title="Performance Analytics"
          subtitle="Quick overview of attendance and fee collection"
        >
          <div style={styles.analyticsGrid}>
            <AnalyticsCard
              icon="📅"
              title="Attendance"
              percent={dashboardStats.attendancePercent}
              left={`${dashboardStats.present} Present`}
              middle={`${dashboardStats.absent} Absent`}
              right={`${dashboardStats.totalAttendance} Total`}
              fillStyle={styles.attendanceFill}
            />

            <AnalyticsCard
              icon="💰"
              title="Fee Collection"
              percent={dashboardStats.feePercent}
              left={`₹${money(dashboardStats.totalFee)} Total`}
              middle={`₹${money(dashboardStats.paidFee)} Paid`}
              right={`₹${money(dashboardStats.dueFee)} Due`}
              fillStyle={styles.feeFill}
            />
          </div>
        </Section>

        {/* ATTENDANCE */}
        <Section
          icon="📅"
          title="Mark Attendance"
          subtitle="Record daily attendance for your students"
        >
          <form onSubmit={handleMarkAttendance} style={styles.formGrid}>
            <Field label="Student">
              <select
                value={attendanceStudent}
                onChange={(e) =>
                  setAttendanceStudent(e.target.value)
                }
                style={styles.input}
              >
                <option value="">Select Student</option>
                {students.map((student) => {
                  const sId = student._id || student.id || student.userId;
                  return (
                    <option
                      key={sId}
                      value={sId}
                    >
                      {student.name} {student.branch ? `(${student.branch}${student.section ? ` - ${student.section}` : ""})` : ""}
                    </option>
                  );
                })}
              </select>
            </Field>

            <Field label="Date">
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) =>
                  setAttendanceDate(e.target.value)
                }
                style={styles.input}
              />
            </Field>

            <Field label="Status">
              <select
                value={attendanceStatus}
                onChange={(e) =>
                  setAttendanceStatus(e.target.value)
                }
                style={styles.input}
              >
                <option value="PRESENT">PRESENT</option>
                <option value="ABSENT">ABSENT</option>
              </select>
            </Field>

            <Field label="Reason (if absent)">
              <input
                value={attendanceReason}
                onChange={(e) =>
                  setAttendanceReason(e.target.value)
                }
                placeholder="Optional reason"
                style={styles.input}
              />
            </Field>

            <button style={styles.primaryButton} type="submit">
              ✅ Save Attendance
            </button>
          </form>
        </Section>

        {/* MARKS */}
        <Section
          icon="📚"
          title="Add Marks"
          subtitle="Store examination performance for students"
        >
          <form onSubmit={handleAddMarks} style={styles.formGrid}>
            <Field label="Student">
              <StudentSelect
                value={marksStudent}
                onChange={setMarksStudent}
                students={students}
              />
            </Field>

            <Field label="Subject">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Mathematics"
                style={styles.input}
              />
            </Field>

            <Field label="Exam">
              <input
                value={exam}
                onChange={(e) => setExam(e.target.value)}
                placeholder="Mid Term"
                style={styles.input}
              />
            </Field>

            <Field label="Marks Obtained">
              <input
                type="number"
                min="0"
                value={marksObtained}
                onChange={(e) =>
                  setMarksObtained(e.target.value)
                }
                style={styles.input}
              />
            </Field>

            <Field label="Maximum Marks">
              <input
                type="number"
                min="1"
                value={maximumMarks}
                onChange={(e) =>
                  setMaximumMarks(e.target.value)
                }
                style={styles.input}
              />
            </Field>

            <button style={styles.primaryButton} type="submit">
              📚 Save Marks
            </button>
          </form>

          <div style={styles.recordGrid}>
            {marksRecords.map((mark) => {
              const max = Number(mark.maxMarks || 0);
              const obtained = Number(mark.marksObtained || 0);
              const percent =
                max > 0
                  ? ((obtained / max) * 100).toFixed(1)
                  : "0.0";

              return (
                <div key={mark._id} style={styles.recordCard}>
                  <div style={styles.recordHeader}>
                    <div>
                      <strong>
                        {mark.student?.name ||
                          getStudentName(mark.student)}
                      </strong>
                      <p style={styles.muted}>
                        {mark.subject} • {mark.exam}
                      </p>
                    </div>

                    <span style={styles.scoreBadge}>
                      {percent}%
                    </span>
                  </div>

                  <p>
                    <strong>
                      {obtained} / {max}
                    </strong>{" "}
                    marks
                  </p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* FEES */}
        <Section
          icon="💰"
          title="Fee Management"
          subtitle="Add fees and update student payments"
        >
          <form onSubmit={handleAddFee} style={styles.formGrid}>
            <Field label="Student">
              <StudentSelect
                value={feeStudent}
                onChange={setFeeStudent}
                students={students}
              />
            </Field>

            <Field label="Total Amount">
              <input
                type="number"
                min="0"
                value={totalAmount}
                onChange={(e) =>
                  setTotalAmount(e.target.value)
                }
                style={styles.input}
              />
            </Field>

            <Field label="Paid Amount">
              <input
                type="number"
                min="0"
                value={paidAmount}
                onChange={(e) =>
                  setPaidAmount(e.target.value)
                }
                style={styles.input}
              />
            </Field>

            <Field label="Due Date">
              <input
                type="date"
                value={dueDate}
                onChange={(e) =>
                  setDueDate(e.target.value)
                }
                style={styles.input}
              />
            </Field>

            <button style={styles.primaryButton} type="submit">
              💰 Save Fee
            </button>
          </form>

          <div style={styles.recordGrid}>
            {feeRecords.map((fee) => {
              const total = Number(fee.totalAmount || 0);
              const paid = Number(fee.paidAmount || 0);
              const remaining = Math.max(total - paid, 0);

              return (
                <div key={fee._id} style={styles.recordCard}>
                  <div style={styles.recordHeader}>
                    <div>
                      <strong>
                        {fee.student?.name ||
                          getStudentName(fee.student)}
                      </strong>
                      <p style={styles.muted}>
                        Fee Record
                      </p>
                    </div>

                    <StatusBadge
                      status={fee.status || "PENDING"}
                    />
                  </div>

                  <div style={styles.moneyGrid}>
                    <MoneyBox label="Total" value={total} />
                    <MoneyBox label="Paid" value={paid} />
                    <MoneyBox
                      label="Remaining"
                      value={remaining}
                    />
                  </div>

                  <p style={styles.muted}>
                    Due: {formatDate(fee.dueDate)}
                  </p>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() =>
                      handleUpdatePayment(fee)
                    }
                  >
                    ✏️ Update Payment
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        {/* HOLIDAY */}
        <Section
          icon="🎉"
          title="Holiday Management"
          subtitle="Add holidays so students can see blank/holiday days instead of attendance"
        >
          <div style={styles.featureBanner}>
            <div style={styles.featureIcon}>🏖️</div>
            <div>
              <strong>Holiday days are not attendance.</strong>
              <p>
                Use this section for college holidays, festivals,
                semester breaks and special holidays.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleAddHoliday}
            style={styles.formGrid}
          >
            <Field label="Holiday Name">
              <input
                value={holidayName}
                onChange={(e) =>
                  setHolidayName(e.target.value)
                }
                placeholder="Independence Day"
                style={styles.input}
              />
            </Field>

            <Field label="Start Date">
              <input
                type="date"
                value={holidayDate}
                onChange={(e) =>
                  setHolidayDate(e.target.value)
                }
                style={styles.input}
              />
            </Field>

            <Field label="End Date">
              <input
                type="date"
                value={holidayEndDate}
                onChange={(e) =>
                  setHolidayEndDate(e.target.value)
                }
                style={styles.input}
              />
            </Field>

            <Field label="Description">
              <input
                value={holidayDescription}
                onChange={(e) =>
                  setHolidayDescription(e.target.value)
                }
                placeholder="College holiday"
                style={styles.input}
              />
            </Field>

            <button
              type="submit"
              style={styles.holidayButton}
            >
              🎉 Add Holiday
            </button>
          </form>

          <div style={styles.recordGrid}>
            {holidays.length === 0 ? (
              <Empty
                icon="🏖️"
                text="No holidays added yet."
              />
            ) : (
              holidays.map((holiday, index) => (
                <div
                  key={holiday._id || index}
                  style={styles.holidayCard}
                >
                  <div style={styles.holidayEmoji}>🎉</div>

                  <h3>
                    {holiday.name ||
                      holiday.title ||
                      "Holiday"}
                  </h3>

                  <p>
                    📅{" "}
                    {formatDate(
                      holiday.startDate ||
                        holiday.date
                    )}
                    {holiday.endDate &&
                    String(
                      holiday.endDate
                    ) !==
                      String(
                        holiday.startDate ||
                          holiday.date
                      )
                      ? ` → ${formatDate(
                          holiday.endDate
                        )}`
                      : ""}
                  </p>

                  <p style={styles.muted}>
                    {holiday.description || "Holiday"}
                  </p>
                </div>
              ))
            )}
          </div>
        </Section>

        {/* TIMETABLE */}
        <Section
          icon="🗓️"
          title="Class Timetable"
          subtitle="Assign periods once for your section"
        >
          <form
            onSubmit={handleAddTimetable}
            style={styles.formGrid}
          >
            <Field label="Day">
              <select
                value={ttDay}
                onChange={(e) =>
                  setTtDay(e.target.value)
                }
                style={styles.input}
              >
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Period">
              <select
                value={ttPeriod}
                onChange={(e) =>
                  setTtPeriod(e.target.value)
                }
                style={styles.input}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(
                  (period) => (
                    <option
                      key={period}
                      value={period}
                    >
                      Period {period}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Subject">
              <input
                value={ttSubject}
                onChange={(e) =>
                  setTtSubject(e.target.value)
                }
                placeholder="Mathematics"
                style={styles.input}
              />
            </Field>

            <Field label="Start Time">
              <input
                type="time"
                value={ttStartTime}
                onChange={(e) =>
                  setTtStartTime(e.target.value)
                }
                style={styles.input}
              />
            </Field>

            <Field label="End Time">
              <input
                type="time"
                value={ttEndTime}
                onChange={(e) =>
                  setTtEndTime(e.target.value)
                }
                style={styles.input}
              />
            </Field>

            <Field label="Room">
              <input
                value={ttRoom}
                onChange={(e) =>
                  setTtRoom(e.target.value)
                }
                placeholder="Room 204"
                style={styles.input}
              />
            </Field>

            <Field label="Teacher">
              <input
                value={ttTeacher}
                onChange={(e) =>
                  setTtTeacher(e.target.value)
                }
                placeholder={user?.name || "Teacher"}
                style={styles.input}
              />
            </Field>

            <button
              type="submit"
              style={styles.timetableButton}
            >
              🗓️ Assign Period
            </button>
          </form>

          <div style={styles.timetableGrid}>
            {days.map((day) => (
              <div
                key={day}
                style={styles.dayCard}
              >
                <div style={styles.dayHeader}>
                  <span>{day.slice(0, 3)}</span>
                  <strong>{day}</strong>
                </div>

                {timetableByDay[day]?.length === 0 ? (
                  <div style={styles.blankPeriod}>
                    No period assigned
                  </div>
                ) : (
                  timetableByDay[day].map(
                    (item, index) => (
                      <div
                        key={
                          item._id ||
                          `${day}-${index}`
                        }
                        style={{
                          ...styles.periodCard,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                          <span style={styles.periodNumber}>
                            P{item.period || index + 1}
                          </span>

                          <div>
                            <strong>
                              {item.subject ||
                                "Subject"}
                            </strong>

                            <p style={{ margin: "2px 0" }}>
                              {item.startTime ||
                                "--:--"}{" "}
                              -{" "}
                              {item.endTime ||
                                "--:--"}
                            </p>

                            {(item.room ||
                              item.teacher) && (
                              <small>
                                {item.room
                                  ? `🏫 ${item.room}`
                                  : ""}
                                {item.room &&
                                item.teacher
                                  ? " • "
                                  : ""}
                                {item.teacher
                                  ? `👨‍🏫 ${item.teacher}`
                                  : ""}
                              </small>
                            )}
                          </div>
                        </div>

                        {item._id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTimetable(item._id)}
                            title="Delete period"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "14px",
                              padding: "2px 4px",
                              opacity: 0.7,
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )
                  )
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* OBSERVATIONS */}
        <Section
          icon="👀"
          title="Student Observations"
          subtitle="Record classroom observations such as forgot books, participation and behaviour"
        >
          <div style={styles.observationBanner}>
            <span>📖</span>
            <div>
              <strong>Classroom observation</strong>
              <p>
                Example: “Forgot to bring Mathematics book”
                or “Excellent participation today”.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleAddObservation}
            style={styles.formGrid}
          >
            <Field label="Student">
              <StudentSelect
                value={observationStudent}
                onChange={setObservationStudent}
                students={students}
              />
            </Field>

            <Field label="Observation Type">
              <select
                value={observationType}
                onChange={(e) =>
                  setObservationType(e.target.value)
                }
                style={styles.input}
              >
                <option value="GENERAL">
                  General
                </option>
                <option value="BOOK">
                  Forgot / Missing Book
                </option>
                <option value="HOMEWORK">
                  Homework
                </option>
                <option value="BEHAVIOUR">
                  Behaviour
                </option>
                <option value="PARTICIPATION">
                  Participation
                </option>
                <option value="PERFORMANCE">
                  Performance
                </option>
                <option value="DISCIPLINE">
                  Discipline
                </option>
              </select>
            </Field>

            <Field label="Date">
              <input
                type="date"
                value={observationDate}
                onChange={(e) =>
                  setObservationDate(e.target.value)
                }
                style={styles.input}
              />
            </Field>

            <Field label="Observation">
              <textarea
                value={observationText}
                onChange={(e) =>
                  setObservationText(e.target.value)
                }
                placeholder="Student forgot to bring Mathematics book..."
                style={{
                  ...styles.input,
                  minHeight: "110px",
                  resize: "vertical",
                }}
              />
            </Field>

            <button
              type="submit"
              style={styles.observationButton}
            >
              👀 Save Observation
            </button>
          </form>

          <div style={styles.recordGrid}>
            {observations.length === 0 ? (
              <Empty
                icon="👀"
                text="No observations recorded yet."
              />
            ) : (
              observations
                .slice()
                .reverse()
                .map((item, index) => (
                  <div
                    key={item._id || index}
                    style={styles.observationCard}
                  >
                    <div style={styles.observationTop}>
                      <div style={styles.observationIcon}>
                        👀
                      </div>

                      <StatusBadge
                        status={
                          item.type ||
                          item.observationType ||
                          "GENERAL"
                        }
                      />
                    </div>

                    <h3>
                      {item.student?.name ||
                        getStudentName(item.student)}
                    </h3>

                    <p style={styles.muted}>
                      📅 {formatDate(item.date)}
                    </p>

                    <p style={styles.observationText}>
                      {item.text ||
                        item.description ||
                        "No description"}
                    </p>
                  </div>
                ))
            )}
          </div>
        </Section>

        {/* LEAVES */}
        <Section
          icon="📝"
          title="Leave Requests"
          subtitle="Student leave applications and approvals"
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map((filterKey) => {
              const count =
                filterKey === "ALL"
                  ? leaveRequests.length
                  : leaveRequests.filter(
                      (l) => String(l.status || "PENDING").toUpperCase() === filterKey
                    ).length;

              const active = leaveFilter === filterKey;

              return (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setLeaveFilter(filterKey)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    border: "none",
                    fontWeight: "800",
                    fontSize: "13px",
                    cursor: "pointer",
                    background: active
                      ? "linear-gradient(135deg,#4f46e5,#7c3aed)"
                      : "#e2e8f0",
                    color: active ? "white" : "#334155",
                    transition: "all 0.15s ease",
                  }}
                >
                  {filterKey} ({count})
                </button>
              );
            })}
          </div>

          {(() => {
            const displayedLeaves =
              leaveFilter === "ALL"
                ? leaveRequests
                : leaveRequests.filter(
                    (l) =>
                      String(l.status || "PENDING").toUpperCase() === leaveFilter
                  );

            if (displayedLeaves.length === 0) {
              return (
                <Empty
                  icon="📝"
                  text={`No ${leaveFilter.toLowerCase()} leave requests found.`}
                />
              );
            }

            return (
              <div style={styles.recordGrid}>
                {displayedLeaves.map((leave, index) => {
                  const status = String(leave.status || "PENDING").toUpperCase();

                  return (
                    <div
                      key={leave._id || index}
                      style={{
                        ...styles.recordCard,
                        borderLeft:
                          status === "APPROVED"
                            ? "5px solid #10b981"
                            : status === "REJECTED"
                            ? "5px solid #ef4444"
                            : "5px solid #f59e0b",
                      }}
                    >
                      <div style={styles.recordHeader}>
                        <div>
                          <strong style={{ fontSize: "16px" }}>
                            {leave.student?.name ||
                              leave.studentName ||
                              getStudentName(leave.student) ||
                              "Student"}
                          </strong>

                          <p style={{ ...styles.muted, margin: "4px 0" }}>
                            📅 {formatDate(leave.fromDate)} → {formatDate(leave.toDate)}
                          </p>
                        </div>

                        <StatusBadge status={leave.status || "PENDING"} />
                      </div>

                      <p style={{ margin: "10px 0 14px", color: "#334155", lineHeight: "1.5" }}>
                        <strong>Reason:</strong> {leave.reason || "No reason provided"}
                      </p>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                        {status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateLeaveStatus(leave._id, "APPROVED")}
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                border: "none",
                                borderRadius: "8px",
                                background: "#10b981",
                                color: "white",
                                fontWeight: "700",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              ✅ Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateLeaveStatus(leave._id, "REJECTED")}
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                border: "none",
                                borderRadius: "8px",
                                background: "#ef4444",
                                color: "white",
                                fontWeight: "700",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              ❌ Reject
                            </button>
                          </>
                        )}

                        {status === "APPROVED" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateLeaveStatus(leave._id, "REJECTED")}
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                border: "none",
                                borderRadius: "8px",
                                background: "#fee2e2",
                                color: "#b91c1c",
                                fontWeight: "700",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              ❌ Mark Rejected
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateLeaveStatus(leave._id, "PENDING")}
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                border: "none",
                                borderRadius: "8px",
                                background: "#fef3c7",
                                color: "#92400e",
                                fontWeight: "700",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              ⏳ Mark Pending
                            </button>
                          </>
                        )}

                        {status === "REJECTED" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateLeaveStatus(leave._id, "APPROVED")}
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                border: "none",
                                borderRadius: "8px",
                                background: "#d1fae5",
                                color: "#065f46",
                                fontWeight: "700",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              ✅ Mark Approved
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateLeaveStatus(leave._id, "PENDING")}
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                border: "none",
                                borderRadius: "8px",
                                background: "#fef3c7",
                                color: "#92400e",
                                fontWeight: "700",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              ⏳ Mark Pending
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Section>

        {/* ISSUES */}
        <Section
          icon="🏫"
          title="Classroom Issues"
          subtitle="Report and resolve classroom problems"
        >
          <div style={styles.formCard}>
            <div style={styles.infoBanner}>
              <strong>Manage Classroom Issues.</strong>
              <span>
                Report issues for students in your section or update resolution status.
              </span>
            </div>

            <form
              style={styles.gridForm}
              onSubmit={handleCreateIssue}
            >
              <Field label="Select Student">
                <select
                  style={styles.input}
                  value={issueStudent}
                  onChange={(e) => setIssueStudent(e.target.value)}
                  required
                >
                  <option value="">-- Select Student --</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name} ({student.email})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Issue Type">
                <select
                  style={styles.input}
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  required
                >
                  <option value="PROJECTOR">Projector / Lab Equipment</option>
                  <option value="INFRASTRUCTURE">Classroom Infrastructure</option>
                  <option value="ACADEMIC">Academic / Syllabus</option>
                  <option value="ATTENDANCE">Attendance Discrepancy</option>
                  <option value="DISCIPLINE">Discipline</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>

              <Field label="Description">
                <input
                  style={styles.input}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Details of the classroom issue..."
                  required
                />
              </Field>

              <button
                type="submit"
                disabled={issueLoading}
                style={styles.primaryButton}
              >
                {issueLoading ? "Reporting..." : "🏫 Report Issue"}
              </button>
            </form>

            <div style={styles.recordGrid}>
              {issues.length === 0 ? (
                <Empty
                  icon="🏫"
                  text="No classroom issues found."
                />
              ) : (
                issues.map((issue, index) => {
                  const isOpen = String(issue.status || "").toUpperCase() === "OPEN";
                  return (
                    <div
                      key={issue._id || index}
                      style={{
                        ...styles.issueCard,
                        borderTop: isOpen ? "4px solid #ef4444" : "4px solid #10b981",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <div style={styles.issueIcon}>🏫</div>
                        <StatusBadge
                          status={issue.status || "OPEN"}
                        />
                      </div>

                      <h3 style={{ margin: "4px 0 8px" }}>
                        {issue.issueType || "Classroom Issue"}
                      </h3>

                      <p style={{ color: "#334155", margin: "6px 0 12px", lineHeight: "1.5" }}>
                        {issue.description || "No description"}
                      </p>

                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px" }}>
                        <div>
                          <strong>Student:</strong>{" "}
                          {issue.student?.name || getStudentName(issue.student)}
                        </div>
                        <div>
                          <strong>Date:</strong> {formatDate(issue.createdAt || issue.date)}
                        </div>
                      </div>

                      <div>
                        {isOpen ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateIssueStatus(issue._id, "RESOLVED")}
                            style={{
                              padding: "8px 14px",
                              border: "none",
                              borderRadius: "8px",
                              background: "#10b981",
                              color: "white",
                              fontWeight: "700",
                              cursor: "pointer",
                              fontSize: "12px",
                              width: "100%",
                            }}
                          >
                            ✅ Mark Resolved
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateIssueStatus(issue._id, "OPEN")}
                            style={{
                              padding: "8px 14px",
                              border: "none",
                              borderRadius: "8px",
                              background: "#f59e0b",
                              color: "white",
                              fontWeight: "700",
                              cursor: "pointer",
                              fontSize: "12px",
                              width: "100%",
                            }}
                          >
                            🔄 Reopen Issue
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Section>

        {/* PDF */}
        <Section
          icon="📄"
          title="Academic PDF Upload"
          subtitle="Upload attendance, marks or fee PDF for your section"
        >
          <div style={styles.pdfBanner}>
            <strong>
              📄 Section:{" "}
              {user?.section || "AIML-A"}
            </strong>

            <span>
              Upload once — backend can process the PDF.
            </span>
          </div>

          <form
            onSubmit={handlePdfUpload}
            style={styles.pdfForm}
          >
            <select
              value={pdfType}
              onChange={(e) =>
                setPdfType(e.target.value)
              }
              style={styles.input}
            >
              <option value="attendance">
                Attendance PDF
              </option>

              <option value="marks">
                Marks PDF
              </option>

              <option value="fees">
                Fee PDF
              </option>
            </select>

            <input
              type="file"
              accept="application/pdf"
              onChange={(e) =>
                setPdfFile(
                  e.target.files?.[0] ||
                    null
                )
              }
              style={styles.fileInput}
            />

            <button
              type="submit"
              disabled={pdfLoading}
              style={styles.pdfButton}
            >
              {pdfLoading
                ? "⏳ Uploading..."
                : "📤 Upload & Preview"}
            </button>
          </form>

          {pdfPreview && (
            <div style={styles.pdfPreview}>
              <h3>📋 PDF Preview</h3>

              <p>
                <strong>File:</strong>{" "}
                {pdfPreview.fileName ||
                  pdfFile?.name ||
                  "-"}
              </p>

              <p>
                <strong>Pages:</strong>{" "}
                {pdfPreview.pageCount ||
                  pdfPreview.numpages ||
                  "-"}
              </p>

              {pdfPreview.text && (
                <pre style={styles.pdfText}>
                  {pdfPreview.text}
                </pre>
              )}

              <small>
                ⚠️ Preview only. Existing database
                records are not automatically changed.
              </small>
            </div>
          )}
        </Section>

        {/* FOOTER */}
        <footer style={styles.footer}>
          <div>
            <strong>🎓 EduBridge</strong>
            <p>
              Academic Management Portal • Mentor Workspace
            </p>
          </div>

          <button
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            🚪 Logout
          </button>
        </footer>
      </div>
    </div>
  );
}

// =====================================================
// COMPONENTS
// =====================================================

function Section({ icon, title, subtitle, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionIcon}>{icon}</div>

        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div style={styles.sectionBody}>
        {children}
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function StudentSelect({
  value,
  onChange,
  students,
}) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      style={styles.input}
    >
      <option value="">
        Select Student
      </option>

      {students.map((student) => {
        const sId = student._id || student.id || student.userId;
        return (
          <option
            key={sId}
            value={sId}
          >
            {student.name} {student.branch ? `(${student.branch}${student.section ? ` - ${student.section}` : ""})` : ""}
          </option>
        );
      })}
    </select>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}) {
  return (
    <div
      style={{
        ...styles.statCard,
        borderTop:
          `4px solid ${toneColor(tone)}`,
      }}
    >
      <div
        style={{
          ...styles.statIcon,
          background:
            `${toneColor(tone)}18`,
        }}
      >
        {icon}
      </div>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={styles.miniStat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AnalyticsCard({
  icon,
  title,
  percent,
  left,
  middle,
  right,
  fillStyle,
}) {
  return (
    <div style={styles.analyticsCard}>
      <div style={styles.analyticsTop}>
        <div>
          <span style={styles.bigIcon}>{icon}</span>
          <h3>{title}</h3>
          <p style={styles.muted}>
            Overall section performance
          </p>
        </div>

        <strong style={styles.percent}>
          {percent}%
        </strong>
      </div>

      <div style={styles.progressTrack}>
        <div
          style={{
            ...styles.progressFill,
            ...fillStyle,
            width: `${Math.min(
              Number(percent) || 0,
              100
            )}%`,
          }}
        />
      </div>

      <div style={styles.analyticsStats}>
        <span>{left}</span>
        <span>{middle}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = String(
    status || "PENDING"
  ).toUpperCase();

  let background =
    "rgba(100,116,139,0.12)";
  let color = "#475569";

  if (
    ["PRESENT", "PAID", "APPROVED", "RESOLVED"].includes(
      value
    )
  ) {
    background =
      "rgba(16,185,129,0.12)";
    color = "#059669";
  }

  if (
    ["ABSENT", "REJECTED"].includes(
      value
    )
  ) {
    background =
      "rgba(239,68,68,0.12)";
    color = "#dc2626";
  }

  if (
    ["PENDING", "PARTIAL", "GENERAL", "OPEN"].includes(
      value
    )
  ) {
    background =
      "rgba(245,158,11,0.14)";
    color = "#b45309";
  }

  if (
    ["LEAVE", "HOLIDAY"].includes(
      value
    )
  ) {
    background =
      "rgba(59,130,246,0.14)";
    color = "#2563eb";
  }

  return (
    <span
      style={{
        ...styles.badge,
        background,
        color,
      }}
    >
      {value}
    </span>
  );
}

function MoneyBox({ label, value }) {
  return (
    <div style={styles.moneyBox}>
      <span>{label}</span>
      <strong>
        ₹{Number(value || 0).toLocaleString("en-IN")}
      </strong>
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div style={styles.empty}>
      <div>{icon}</div>
      <p>{text}</p>
    </div>
  );
}

function toneColor(tone) {
  const colors = {
    purple: "#7c3aed",
    blue: "#2563eb",
    pink: "#db2777",
    green: "#059669",
    orange: "#ea580c",
    cyan: "#0891b2",
    red: "#dc2626",
    indigo: "#4f46e5",
  };

  return colors[tone] || "#4f46e5";
}

// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    minHeight: "100vh",
    padding: "26px 16px 60px",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background:
      "linear-gradient(135deg,#eef2ff 0%,#f8fafc 42%,#ecfeff 100%)",
    color: "#172033",
    position: "relative",
    overflowX: "hidden",
  },

  container: {
    maxWidth: "1250px",
    margin: "0 auto",
    position: "relative",
    zIndex: 2,
  },

  glowOne: {
    position: "fixed",
    width: "430px",
    height: "430px",
    borderRadius: "50%",
    background: "rgba(99,102,241,.13)",
    filter: "blur(90px)",
    top: "-190px",
    right: "-150px",
    pointerEvents: "none",
  },

  glowTwo: {
    position: "fixed",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    background: "rgba(6,182,212,.10)",
    filter: "blur(90px)",
    bottom: "-160px",
    left: "-130px",
    pointerEvents: "none",
  },

  header: {
    padding: "30px",
    borderRadius: "30px",
    color: "white",
    background:
      "linear-gradient(135deg,#312e81,#4f46e5 48%,#0891b2)",
    boxShadow:
      "0 25px 65px rgba(49,46,129,.25)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "25px",
    flexWrap: "wrap",
    position: "relative",
    overflow: "hidden",
    animation: "slideDown .55s ease",
  },

  brand: {
    fontSize: "17px",
    fontWeight: "950",
    letterSpacing: "2px",
    marginBottom: "13px",
  },

  title: {
    margin: 0,
    fontSize: "34px",
    fontWeight: "900",
  },

  subtitle: {
    margin: "8px 0 0",
    opacity: ".9",
  },

  pills: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
    marginTop: "18px",
  },

  pill: {
    padding: "9px 12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,.13)",
    border: "1px solid rgba(255,255,255,.18)",
    fontSize: "12px",
    backdropFilter: "blur(10px)",
  },

  headerButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  refreshButton: {
    padding: "12px 17px",
    border: "none",
    borderRadius: "13px",
    cursor: "pointer",
    background: "white",
    color: "#4338ca",
    fontWeight: "850",
    boxShadow: "0 9px 22px rgba(0,0,0,.12)",
  },

  logoutButton: {
    padding: "12px 17px",
    border: "none",
    borderRadius: "13px",
    cursor: "pointer",
    background: "#dc2626",
    color: "white",
    fontWeight: "850",
  },

  message: {
    marginTop: "18px",
    padding: "14px 17px",
    borderRadius: "15px",
    background: "rgba(16,185,129,.10)",
    border: "1px solid rgba(16,185,129,.20)",
    color: "#047857",
    fontWeight: "800",
    animation: "fadeIn .3s ease",
  },

  statGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: "14px",
    marginTop: "22px",
  },

  statCard: {
    background: "rgba(255,255,255,.94)",
    padding: "18px",
    borderRadius: "19px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    boxShadow: "0 12px 30px rgba(15,23,42,.06)",
    transition:
      "transform .25s ease,box-shadow .25s ease",
  },

  statIcon: {
    width: "50px",
    height: "50px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
  },

  section: {
    marginTop: "30px",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    marginBottom: "15px",
  },

  sectionIcon: {
    width: "50px",
    height: "50px",
    borderRadius: "16px",
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    boxShadow: "0 10px 25px rgba(15,23,42,.07)",
  },

  sectionBody: {
    background: "rgba(255,255,255,.78)",
    border:
      "1px solid rgba(148,163,184,.16)",
    borderRadius: "23px",
    padding: "21px",
    boxShadow: "0 14px 35px rgba(15,23,42,.055)",
    backdropFilter: "blur(10px)",
  },

  studentGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(270px,1fr))",
    gap: "16px",
  },

  studentCard: {
    background: "white",
    padding: "19px",
    borderRadius: "20px",
    border: "1px solid #eef2f7",
    boxShadow: "0 12px 28px rgba(15,23,42,.055)",
    transition:
      "transform .25s ease,box-shadow .25s ease",
  },

  studentTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  avatar: {
    width: "52px",
    height: "52px",
    borderRadius: "17px",
    background:
      "linear-gradient(135deg,#eef2ff,#cffafe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "26px",
  },

  attendanceBadge: {
    padding: "8px 11px",
    borderRadius: "12px",
    background: "rgba(16,185,129,.12)",
    color: "#059669",
    fontWeight: "900",
  },

  muted: {
    color: "#64748b",
    fontSize: "13px",
  },

  studentInfo: {
    display: "flex",
    justifyContent: "space-between",
    padding: "9px 0",
    borderTop: "1px solid #f1f5f9",
    fontSize: "13px",
  },

  miniStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: "8px",
    marginTop: "13px",
  },

  miniStat: {
    background: "#f8fafc",
    padding: "10px",
    borderRadius: "12px",
    textAlign: "center",
  },

  analyticsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(330px,1fr))",
    gap: "16px",
  },

  analyticsCard: {
    background: "white",
    padding: "22px",
    borderRadius: "20px",
    boxShadow: "0 12px 30px rgba(15,23,42,.055)",
  },

  analyticsTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
  },

  bigIcon: {
    fontSize: "27px",
  },

  percent: {
    fontSize: "28px",
    color: "#4f46e5",
  },

  progressTrack: {
    height: "10px",
    borderRadius: "999px",
    background: "#e2e8f0",
    overflow: "hidden",
    marginTop: "18px",
  },

  progressFill: {
    height: "100%",
    borderRadius: "999px",
    transition: "width .8s ease",
  },

  attendanceFill: {
    background:
      "linear-gradient(90deg,#4f46e5,#06b6d4)",
  },

  feeFill: {
    background:
      "linear-gradient(90deg,#10b981,#14b8a6)",
  },

  analyticsStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: "8px",
    marginTop: "15px",
    fontSize: "11px",
    color: "#64748b",
    textAlign: "center",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "14px",
    alignItems: "end",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    fontSize: "12px",
    fontWeight: "800",
    color: "#475569",
  },

  input: {
    width: "100%",
    padding: "12px 13px",
    borderRadius: "12px",
    border: "1px solid #dbe3ee",
    background: "white",
    color: "#172033",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },

  primaryButton: {
    padding: "13px 16px",
    border: "none",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#4f46e5,#7c3aed)",
    color: "white",
    fontWeight: "850",
    cursor: "pointer",
  },

  secondaryButton: {
    padding: "10px 13px",
    border: "none",
    borderRadius: "11px",
    background: "#eef2ff",
    color: "#4338ca",
    fontWeight: "800",
    cursor: "pointer",
  },

  holidayButton: {
    padding: "13px 16px",
    border: "none",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#f97316,#ea580c)",
    color: "white",
    fontWeight: "850",
    cursor: "pointer",
  },

  timetableButton: {
    padding: "13px 16px",
    border: "none",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#0891b2,#0e7490)",
    color: "white",
    fontWeight: "850",
    cursor: "pointer",
  },

  observationButton: {
    padding: "13px 16px",
    border: "none",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#dc2626,#be123c)",
    color: "white",
    fontWeight: "850",
    cursor: "pointer",
  },

  recordGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(280px,1fr))",
    gap: "14px",
    marginTop: "18px",
  },

  recordCard: {
    background: "white",
    padding: "18px",
    borderRadius: "18px",
    border: "1px solid #eef2f7",
    boxShadow: "0 10px 25px rgba(15,23,42,.045)",
  },

  recordHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },

  scoreBadge: {
    padding: "8px 10px",
    borderRadius: "11px",
    background: "rgba(16,185,129,.12)",
    color: "#059669",
    fontWeight: "900",
  },

  badge: {
    display: "inline-flex",
    width: "fit-content",
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: ".4px",
  },

  moneyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: "8px",
    margin: "15px 0",
  },

  moneyBox: {
    padding: "11px",
    background: "#f8fafc",
    borderRadius: "12px",
  },

  featureBanner: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    padding: "14px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg,#fff7ed,#ffedd5)",
    marginBottom: "16px",
  },

  featureIcon: {
    fontSize: "32px",
  },

  holidayCard: {
    background:
      "linear-gradient(135deg,#fff7ed,#ffffff)",
    padding: "18px",
    borderRadius: "18px",
    borderTop: "4px solid #f97316",
  },

  holidayEmoji: {
    fontSize: "30px",
  },

  timetableGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",
    gap: "13px",
    marginTop: "20px",
  },

  dayCard: {
    background: "#f8fafc",
    borderRadius: "17px",
    padding: "13px",
    minHeight: "150px",
  },

  dayHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },

  periodCard: {
    display: "flex",
    gap: "10px",
    padding: "12px",
    borderRadius: "13px",
    background: "white",
    marginTop: "8px",
    boxShadow: "0 5px 14px rgba(15,23,42,.05)",
  },

  periodNumber: {
    width: "28px",
    height: "28px",
    borderRadius: "9px",
    background: "#cffafe",
    color: "#0e7490",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "12px",
    flexShrink: 0,
  },

  blankPeriod: {
    padding: "30px 10px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "12px",
  },

  observationBanner: {
    display: "flex",
    gap: "12px",
    padding: "14px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg,#fff1f2,#fef2f2)",
    marginBottom: "16px",
  },

  observationIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "14px",
    background: "rgba(220,38,38,.10)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  observationTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  observationCard: {
    background: "white",
    padding: "18px",
    borderRadius: "18px",
    borderTop: "4px solid #dc2626",
    boxShadow: "0 10px 25px rgba(15,23,42,.05)",
  },

  observationText: {
    lineHeight: 1.65,
    color: "#334155",
  },

  issueCard: {
    background: "white",
    padding: "18px",
    borderRadius: "18px",
    borderTop: "4px solid #ef4444",
    boxShadow: "0 10px 25px rgba(15,23,42,.05)",
  },

  issueIcon: {
    fontSize: "30px",
    marginBottom: "10px",
  },

  pdfBanner: {
    padding: "14px",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg,#eef2ff,#ecfeff)",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "15px",
  },

  pdfForm: {
    display: "grid",
    gridTemplateColumns:
      "minmax(180px,1fr) minmax(220px,1fr) auto",
    gap: "12px",
    alignItems: "center",
  },

  fileInput: {
    width: "100%",
  },

  pdfButton: {
    padding: "12px 16px",
    border: "none",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#4f46e5,#0891b2)",
    color: "white",
    fontWeight: "850",
    cursor: "pointer",
  },

  pdfPreview: {
    marginTop: "18px",
    padding: "17px",
    borderRadius: "16px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  pdfText: {
    whiteSpace: "pre-wrap",
    maxHeight: "380px",
    overflow: "auto",
    background: "white",
    padding: "13px",
    borderRadius: "12px",
    fontSize: "12px",
  },

  empty: {
    padding: "38px 18px",
    textAlign: "center",
    color: "#64748b",
    border: "1px dashed #cbd5e1",
    borderRadius: "17px",
    background: "rgba(255,255,255,.6)",
  },

  footer: {
    marginTop: "42px",
    paddingTop: "22px",
    borderTop: "1px solid rgba(148,163,184,.25)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    color: "#64748b",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background:
      "linear-gradient(135deg,#eef2ff,#ecfeff)",
    fontFamily: "Inter,system-ui,sans-serif",
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
    animation: "float 1.7s ease-in-out infinite",
  },

  loader: {
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    border: "5px solid #e2e8f0",
    borderTopColor: "#4f46e5",
    animation: "spin .8s linear infinite",
  },
};

// =====================================================
// GLOBAL ANIMATIONS
// =====================================================

if (
  typeof document !== "undefined" &&
  !document.getElementById(
    "edubridge-mentor-animations"
  )
) {
  const style =
    document.createElement("style");

  style.id =
    "edubridge-mentor-animations";

  style.innerHTML = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes float {
      0%,100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-7px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-18px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    * {
      box-sizing: border-box;
    }

    button {
      transition:
        transform .2s ease,
        box-shadow .2s ease,
        opacity .2s ease;
    }

    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow:
        0 10px 24px rgba(15,23,42,.12);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
    }

    select:focus,
    input:focus,
    textarea:focus {
      border-color: #6366f1 !important;
      box-shadow:
        0 0 0 3px rgba(99,102,241,.10);
    }

    @media (max-width: 720px) {
      .edubridge-no-overflow {
        overflow-x: hidden;
      }
    }
  `;

  document.head.appendChild(style);
}

export default MentorDashboard;
