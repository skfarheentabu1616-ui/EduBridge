
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Marks");
const Observation = require("../models/Observation");

const router = express.Router();

// =====================================================
// GET ASSIGNED STUDENTS FOR A SPECIFIC MENTOR
// GET /api/mentor/:mentorId/students
// GET /api/mentor/students/:mentorId
// =====================================================

const getAssignedStudentsHandler = async (req, res) => {
  try {
    const mentorId = req.params.mentorId || req.query.mentorId;

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

    // Query students assigned specifically to this mentor
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

router.get("/:mentorId/students", getAssignedStudentsHandler);
router.get("/students/:mentorId", getAssignedStudentsHandler);

// Optional fallback route if mentorId is passed as query param: GET /api/mentor/students?mentorId=...
router.get("/students", async (req, res) => {
  if (req.query.mentorId) {
    return getAssignedStudentsHandler(req, res);
  }

  try {
    const students = await User.find(
      { role: "STUDENT" },
      "name email role branch section mentor createdAt"
    )
      .populate("mentor", "name email branch section")
      .sort({ name: 1 });

    res.json(students);
  } catch (error) {
    console.error("Get all mentor students error:", error);
    res.status(500).json({
      message: "Failed to load students",
      error: error.message,
    });
  }
});

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
