
const express = require("express");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Holiday = require("../models/Holiday");
const LeaveLetter = require("../models/LeaveLetter");

const router = express.Router();

// =====================================================
// HELPER
// Verify that mentor and student exist
// =====================================================

const verifyAIMLAAccess = async (mentorId, studentId) => {
  const actualMentorId =
    mentorId && typeof mentorId === "object"
      ? mentorId._id || mentorId.id
      : mentorId;

  const actualStudentId =
    studentId && typeof studentId === "object"
      ? studentId._id || studentId.id
      : studentId;

  const mentor = await User.findOne({
    _id: actualMentorId,
    role: "MENTOR",
  });

  if (!mentor) {
    return {
      valid: false,
      message: "Mentor not found",
    };
  }

  const student = await User.findOne({
    _id: actualStudentId,
    role: "STUDENT",
  });

  if (!student) {
    return {
      valid: false,
      message: "Student not found",
    };
  }

  return {
    valid: true,
    mentor,
    student,
  };
};

// =====================================================
// MARK / UPDATE ATTENDANCE
// POST /api/attendance/mark
// =====================================================

router.post("/mark", async (req, res) => {
  try {
    let {
      student,
      mentor,
      date,
      status,
      reason,
    } = req.body;

    const studentId =
      student && typeof student === "object"
        ? student._id || student.id
        : student;

    const mentorId =
      mentor && typeof mentor === "object"
        ? mentor._id || mentor.id
        : mentor;

    // -----------------------------------------------
    // BASIC VALIDATION
    // -----------------------------------------------

    if (!studentId || !mentorId || !date || !status) {
      return res.status(400).json({
        message: "Please provide student, mentor, date, and status",
      });
    }

    const validStatus = String(status).toUpperCase();
    if (!["PRESENT", "ABSENT", "LEAVE"].includes(validStatus)) {
      return res.status(400).json({
        message: "Status must be PRESENT, ABSENT, or LEAVE",
      });
    }

    // -----------------------------------------------
    // DATE NORMALIZATION
    // -----------------------------------------------

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date provided",
      });
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // -----------------------------------------------
    // SECURITY CHECK
    // -----------------------------------------------

    const access = await verifyAIMLAAccess(mentorId, studentId);
    if (!access.valid) {
      return res.status(403).json({
        message: access.message,
      });
    }

    // -----------------------------------------------
    // HOLIDAY CHECK
    // Attendance should not be marked on holidays
    // -----------------------------------------------

    const holidayFound = await Holiday.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (holidayFound) {
      return res.status(400).json({
        message: `Cannot mark attendance on a holiday: ${holidayFound.title} (${holidayFound.type || "Holiday"}). Attendance is not required on holidays.`,
        holiday: holidayFound,
      });
    }

    // -----------------------------------------------
    // APPROVED LEAVE CHECK
    // If student has approved leave covering this date, record as LEAVE / excused
    // -----------------------------------------------

    const approvedLeave = await LeaveLetter.findOne({
      student: studentId,
      status: "APPROVED",
      fromDate: { $lte: endOfDay },
      toDate: { $gte: startOfDay },
    });

    let finalStatus = validStatus;
    let finalReason = reason || "";

    if (approvedLeave && validStatus === "ABSENT") {
      finalStatus = "LEAVE";
      finalReason = `Approved Leave: ${approvedLeave.reason || "Student is on approved leave"}`;
    }

    // -----------------------------------------------
    // DUPLICATE ATTENDANCE PREVENTION
    // Match by student and date range
    // -----------------------------------------------

    const existingAttendance = await Attendance.findOne({
      student: studentId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingAttendance) {
      existingAttendance.status = finalStatus;
      existingAttendance.reason = finalStatus === "PRESENT" ? "" : finalReason;
      existingAttendance.mentor = mentorId;
      existingAttendance.date = startOfDay;

      await existingAttendance.save();

      const updatedAttendance = await Attendance.findById(existingAttendance._id)
        .populate("student", "name email branch section")
        .populate("mentor", "name email branch section");

      return res.json({
        message: "Attendance updated successfully (duplicate entry updated)",
        attendance: updatedAttendance,
      });
    }

    // -----------------------------------------------
    // CREATE NEW ATTENDANCE
    // -----------------------------------------------

    const attendance = await Attendance.create({
      student: studentId,
      mentor: mentorId,
      date: startOfDay,
      status: finalStatus,
      reason: finalStatus === "PRESENT" ? "" : finalReason,
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section");

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance: populatedAttendance,
    });
  } catch (error) {
    console.error("Attendance mark error:", error);

    res.status(500).json({
      message: "Failed to mark attendance",
      error: error.message,
    });
  }
});

// =====================================================
// GET ALL ATTENDANCE
// GET /api/attendance
// =====================================================

router.get("/", async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section")
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    console.error("All attendance error:", error);
    res.status(500).json({
      message: "Failed to get attendance records",
      error: error.message,
    });
  }
});

// =====================================================
// GET STUDENT ATTENDANCE
// GET /api/attendance/student/:studentId
// =====================================================

router.get("/student/:studentId", async (req, res) => {
  try {
    const student = await User.findOne({
      _id: req.params.studentId,
      role: "STUDENT",
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    const attendance = await Attendance.find({
      student: req.params.studentId,
    })
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section")
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    console.error("Student attendance error:", error);

    res.status(500).json({
      message: "Failed to get attendance",
      error: error.message,
    });
  }
});

// =====================================================
// GET MENTOR ATTENDANCE
// GET /api/attendance/mentor/:mentorId
// =====================================================

router.get("/mentor/:mentorId", async (req, res) => {
  try {
    const mentor = await User.findOne({
      _id: req.params.mentorId,
      role: "MENTOR",
    });

    if (!mentor) {
      return res.status(404).json({
        message: "Mentor not found",
      });
    }

    const attendance = await Attendance.find()
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section")
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    console.error("Mentor attendance error:", error);

    res.status(500).json({
      message: "Failed to get mentor attendance",
      error: error.message,
    });
  }
});

module.exports = router;
