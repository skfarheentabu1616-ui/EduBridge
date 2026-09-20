
const express = require("express");
const LeaveLetter = require("../models/LeaveLetter");
const User = require("../models/User");

const router = express.Router();

// =====================================================
// APPLY LEAVE LETTER
// POST /api/leave
// POST /api/leave/apply
// =====================================================
const handleApplyLeave = async (req, res) => {
  try {
    let {
      student,
      mentor,
      fromDate,
      toDate,
      reason,
      branch,
      section,
    } = req.body;

    if (!student || !fromDate || !toDate || !reason) {
      return res.status(400).json({
        message: "Please provide student, fromDate, toDate, and reason",
      });
    }

    // Auto-detect mentor if not provided
    if (!mentor) {
      const studentUser = await User.findById(student);
      const studentBranch = branch || studentUser?.branch || "";
      const studentSection = section || studentUser?.section || "";

      let foundMentor = null;
      if (studentBranch && studentSection) {
        foundMentor = await User.findOne({
          role: "MENTOR",
          branch: studentBranch,
          section: studentSection,
        });
      }

      if (!foundMentor) {
        foundMentor = await User.findOne({ role: "MENTOR" });
      }

      if (foundMentor) {
        mentor = foundMentor._id;
      }
    }

    if (!mentor) {
      return res.status(400).json({
        message: "No mentor assigned to receive this leave application",
      });
    }

    const leaveLetter = await LeaveLetter.create({
      student,
      mentor,
      fromDate,
      toDate,
      reason,
      status: "PENDING",
    });

    const populatedLeave = await LeaveLetter.findById(leaveLetter._id)
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section");

    res.status(201).json({
      message: "Leave application submitted successfully",
      leaveLetter: populatedLeave,
      leave: populatedLeave,
    });
  } catch (error) {
    console.error("APPLY LEAVE ERROR:", error);
    res.status(500).json({
      message: "Failed to submit leave application",
      error: error.message,
    });
  }
};

router.post("/", handleApplyLeave);
router.post("/apply", handleApplyLeave);

// =====================================================
// GET ALL LEAVE REQUESTS
// GET /api/leave
// GET /api/leaves
// =====================================================
router.get("/", async (req, res) => {
  try {
    const leaveLetters = await LeaveLetter.find()
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section")
      .sort({ createdAt: -1 });

    res.json({
      message: "Leave requests loaded successfully",
      leaves: leaveLetters,
    });
  } catch (error) {
    console.error("GET ALL LEAVES ERROR:", error);
    res.status(500).json({
      message: "Failed to load leave requests",
      error: error.message,
    });
  }
});

// =====================================================
// GET STUDENT'S LEAVE LETTERS
// GET /api/leave/student/:studentId
// =====================================================
router.get("/student/:studentId", async (req, res) => {
  try {
    const leaveLetters = await LeaveLetter.find({
      student: req.params.studentId,
    })
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section")
      .sort({ createdAt: -1 });

    res.json(leaveLetters);
  } catch (error) {
    console.error("GET STUDENT LEAVES ERROR:", error);
    res.status(500).json({
      message: "Failed to get leave letters",
      error: error.message,
    });
  }
});

// =====================================================
// GET MENTOR'S LEAVE REQUESTS
// GET /api/leave/mentor/:mentorId
// =====================================================
router.get("/mentor/:mentorId", async (req, res) => {
  try {
    const leaveLetters = await LeaveLetter.find({
      mentor: req.params.mentorId,
    })
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section")
      .sort({ createdAt: -1 });

    res.json(leaveLetters);
  } catch (error) {
    console.error("GET MENTOR LEAVES ERROR:", error);
    res.status(500).json({
      message: "Failed to get mentor leave requests",
      error: error.message,
    });
  }
});

// =====================================================
// MENTOR APPROVES OR REJECTS LEAVE
// PUT /api/leave/:leaveId/status
// =====================================================
router.put("/:leaveId/status", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatus = String(status || "").toUpperCase();

    if (!["APPROVED", "REJECTED", "PENDING"].includes(validStatus)) {
      return res.status(400).json({
        message: "Status must be APPROVED, REJECTED, or PENDING",
      });
    }

    const leaveLetter = await LeaveLetter.findByIdAndUpdate(
      req.params.leaveId,
      { status: validStatus },
      { new: true }
    )
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section");

    if (!leaveLetter) {
      return res.status(404).json({
        message: "Leave letter not found",
      });
    }

    res.json({
      message: `Leave letter marked as ${validStatus.toLowerCase()}`,
      leaveLetter,
      leave: leaveLetter,
    });
  } catch (error) {
    console.error("UPDATE LEAVE STATUS ERROR:", error);
    res.status(500).json({
      message: "Failed to update leave status",
      error: error.message,
    });
  }
});

// Helper routes for direct approve / reject
router.put("/:leaveId/approve", async (req, res) => {
  req.body.status = "APPROVED";
  router.handle(req, res);
});

router.put("/:leaveId/reject", async (req, res) => {
  req.body.status = "REJECTED";
  router.handle(req, res);
});

module.exports = router;

