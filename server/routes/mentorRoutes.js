
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Marks");
const Observation = require("../models/Observation");

const router = express.Router();

const jwt = require("jsonwebtoken");

// Helper to extract mentor ID from params, query, or Bearer JWT token
const extractMentorId = (req) => {
  if (req.params.mentorId && mongoose.Types.ObjectId.isValid(req.params.mentorId)) {
    return req.params.mentorId;
  }
  if (req.query.mentorId && mongoose.Types.ObjectId.isValid(req.query.mentorId)) {
    return req.query.mentorId;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "edubridge_secret_2026");
      if (decoded && (decoded.id || decoded._id)) {
        return decoded.id || decoded._id;
      }
    } catch {
      // ignore
    }
  }
  return null;
};

// =====================================================
// GET ASSIGNED STUDENTS FOR A SPECIFIC MENTOR
// GET /api/mentor/students
// GET /api/mentor/:mentorId/students
// GET /api/mentor/students/:mentorId
// =====================================================

const getAssignedStudentsHandler = async (req, res) => {
  try {
    const mentorId = extractMentorId(req);

    if (!mentorId || !mongoose.Types.ObjectId.isValid(mentorId)) {
      return res.status(400).json({
        message: "A valid authenticated Mentor ID is required",
      });
    }

    const mentor = await User.findOne({
      _id: mentorId,
      role: "MENTOR",
    });

    if (!mentor) {
      return res.status(404).json({
        message: "Mentor account not found",
      });
    }

    // Query all students assigned specifically to this mentor (NO limits)
    const assignedStudents = await User.find(
      {
        role: "STUDENT",
        mentor: mentor._id,
      },
      "name email role branch section mentor createdAt"
    )
      .populate("mentor", "name email branch section")
      .sort({ name: 1 });

    res.json(assignedStudents);
  } catch (error) {
    console.error("Get mentor assigned students error:", error);
    res.status(500).json({
      message: "Failed to load assigned students",
      error: error.message,
    });
  }
};

router.get("/students", getAssignedStudentsHandler);
router.get("/:mentorId/students", getAssignedStudentsHandler);
router.get("/students/:mentorId", getAssignedStudentsHandler);

// =====================================================
// GET MENTOR SUMMARY & STATS
// GET /api/mentor/:mentorId/stats
// =====================================================

router.get("/:mentorId/stats", async (req, res) => {
  try {
    const mentorId = req.params.mentorId;

    if (!mentorId || !mongoose.Types.ObjectId.isValid(mentorId)) {
      return res.status(400).json({
        message: "A valid Mentor ID is required",
      });
    }

    const mentor = await User.findOne({
      _id: mentorId,
      role: "MENTOR",
    });

    if (!mentor) {
      return res.status(404).json({
        message: "Mentor account not found",
      });
    }

    const assignedStudents = await User.find({
      role: "STUDENT",
      mentor: mentor._id,
    });

    const studentIds = assignedStudents.map((s) => s._id);

    const [attendanceCount, marksCount, observationsCount] = await Promise.all([
      Attendance.countDocuments({
        student: { $in: studentIds },
        mentor: mentor._id,
      }),
      Mark.countDocuments({
        student: { $in: studentIds },
        mentor: mentor._id,
      }),
      Observation.countDocuments({
        student: { $in: studentIds },
        mentor: mentor._id,
      }),
    ]);

    res.json({
      mentor: {
        _id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        branch: mentor.branch,
        section: mentor.section,
      },
      assignedCount: assignedStudents.length,
      assignedStudents,
      stats: {
        totalAssignedStudents: assignedStudents.length,
        attendanceCount,
        marksCount,
        observationsCount,
      },
    });
  } catch (error) {
    console.error("Get mentor stats error:", error);
    res.status(500).json({
      message: "Failed to load mentor statistics",
      error: error.message,
    });
  }
});

module.exports = router;
