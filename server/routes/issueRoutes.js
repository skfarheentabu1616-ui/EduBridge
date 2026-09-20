
const express = require("express");
const Issue = require("../models/Issue");
const User = require("../models/User");

const router = express.Router();

// ==========================================
// CREATE / REPORT CLASSROOM ISSUE
// POST /api/issues
// POST /api/issues/report
// POST /api/issues/create
// ==========================================
const handleCreateIssue = async (req, res) => {
  try {
    let {
      student,
      mentor,
      issueType,
      description,
      status,
    } = req.body;

    if (!issueType || !description) {
      return res.status(400).json({
        message: "Issue type and description are required",
      });
    }

    // Auto-detect mentor if student is provided and mentor is missing
    if (!mentor && student) {
      const studentUser = await User.findById(student);
      if (studentUser) {
        const foundMentor = await User.findOne({
          role: "MENTOR",
          branch: studentUser.branch || "",
          section: studentUser.section || "",
        }) || await User.findOne({ role: "MENTOR" });

        if (foundMentor) {
          mentor = foundMentor._id;
        }
      }
    }

    // Auto-detect student if mentor is provided and student is missing
    if (!student && mentor) {
      const mentorUser = await User.findById(mentor);
      if (mentorUser) {
        const foundStudent = await User.findOne({
          role: "STUDENT",
          branch: mentorUser.branch || "",
          section: mentorUser.section || "",
        }) || await User.findOne({ role: "STUDENT" });

        if (foundStudent) {
          student = foundStudent._id;
        }
      }
    }

    if (!student || !mentor) {
      return res.status(400).json({
        message: "Please select a valid student and mentor",
      });
    }

    const issue = await Issue.create({
      student,
      mentor,
      issueType,
      description,
      status: status === "RESOLVED" ? "RESOLVED" : "OPEN",
    });

    const populatedIssue = await Issue.findById(issue._id)
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section");

    res.status(201).json({
      message: "Classroom issue reported successfully",
      issue: populatedIssue,
    });
  } catch (error) {
    console.error("CREATE ISSUE ERROR:", error);
    res.status(500).json({
      message: "Failed to report classroom issue",
      error: error.message,
    });
  }
};

router.post("/", handleCreateIssue);
router.post("/report", handleCreateIssue);
router.post("/create", handleCreateIssue);

// ==========================================
// GET ALL ISSUES
// GET /api/issues
// ==========================================
router.get("/", async (req, res) => {
  try {
    const issues = await Issue.find()
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section")
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    console.error("GET ALL ISSUES ERROR:", error);
    res.status(500).json({
      message: "Failed to load classroom issues",
      error: error.message,
    });
  }
});

// ==========================================
// GET STUDENT ISSUES
// GET /api/issues/student/:studentId
// ==========================================
router.get("/student/:studentId", async (req, res) => {
  try {
    const issues = await Issue.find({
      student: req.params.studentId,
    })
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section")
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    console.error("GET STUDENT ISSUES ERROR:", error);
    res.status(500).json({
      message: "Failed to get student issues",
      error: error.message,
    });
  }
});

// ==========================================
// GET MENTOR ISSUES
// GET /api/issues/mentor/:mentorId
// ==========================================
router.get("/mentor/:mentorId", async (req, res) => {
  try {
    const issues = await Issue.find({
      mentor: req.params.mentorId,
    })
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section")
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    console.error("GET MENTOR ISSUES ERROR:", error);
    res.status(500).json({
      message: "Failed to get mentor issues",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE ISSUE STATUS (OPEN / RESOLVED)
// PUT /api/issues/:issueId/status
// ==========================================
router.put("/:issueId/status", async (req, res) => {
  try {
    const { status } = req.body;
    const newStatus = String(status || "").toUpperCase() === "OPEN" ? "OPEN" : "RESOLVED";

    const issue = await Issue.findByIdAndUpdate(
      req.params.issueId,
      { status: newStatus },
      { new: true }
    )
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section");

    if (!issue) {
      return res.status(404).json({
        message: "Classroom issue not found",
      });
    }

    res.json({
      message: `Classroom issue marked as ${newStatus}`,
      issue,
    });
  } catch (error) {
    console.error("UPDATE ISSUE STATUS ERROR:", error);
    res.status(500).json({
      message: "Failed to update issue status",
      error: error.message,
    });
  }
});

// ==========================================
// MENTOR RESOLVES ISSUE
// PUT /api/issues/:issueId/resolve
// ==========================================
router.put("/:issueId/resolve", async (req, res) => {
  try {
    const issue = await Issue.findByIdAndUpdate(
      req.params.issueId,
      {
        status: "RESOLVED",
      },
      {
        new: true,
      }
    )
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section");

    if (!issue) {
      return res.status(404).json({
        message: "Classroom issue not found",
      });
    }

    res.json({
      message: "Classroom issue resolved successfully",
      issue,
    });
  } catch (error) {
    console.error("RESOLVE ISSUE ERROR:", error);
    res.status(500).json({
      message: "Failed to resolve classroom issue",
      error: error.message,
    });
  }
});

// ==========================================
// REOPEN ISSUE
// PUT /api/issues/:issueId/reopen
// ==========================================
router.put("/:issueId/reopen", async (req, res) => {
  try {
    const issue = await Issue.findByIdAndUpdate(
      req.params.issueId,
      {
        status: "OPEN",
      },
      {
        new: true,
      }
    )
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section");

    if (!issue) {
      return res.status(404).json({
        message: "Classroom issue not found",
      });
    }

    res.json({
      message: "Classroom issue reopened successfully",
      issue,
    });
  } catch (error) {
    console.error("REOPEN ISSUE ERROR:", error);
    res.status(500).json({
      message: "Failed to reopen classroom issue",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE ISSUE
// DELETE /api/issues/:issueId
// ==========================================
router.delete("/:issueId", async (req, res) => {
  try {
    const issue = await Issue.findByIdAndDelete(req.params.issueId);

    if (!issue) {
      return res.status(404).json({
        message: "Classroom issue not found",
      });
    }

    res.json({
      message: "Classroom issue deleted successfully",
    });
  } catch (error) {
    console.error("DELETE ISSUE ERROR:", error);
    res.status(500).json({
      message: "Failed to delete classroom issue",
      error: error.message,
    });
  }
});

module.exports = router;

