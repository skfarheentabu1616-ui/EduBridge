const express = require("express");

const User = require("../models/User");
const Parent = require("../models/Parent");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Marks");
const Fee = require("../models/Fee");
const LeaveLetter = require("../models/LeaveLetter");
const Issue = require("../models/Issue");

const bcrypt = require("bcryptjs");

const router = express.Router();

// =====================================================
// GET ADMIN DASHBOARD
// GET /api/admin/dashboard
// =====================================================

router.get("/dashboard", async (req, res) => {
  try {
    const [
      users,
      parents,
      attendance,
      marks,
      fees,
      leaves,
      issues,
    ] = await Promise.all([
      User.find(
        {},
        "name email role branch section mentor createdAt"
      )
        .populate("mentor", "name email branch section")
        .sort({ createdAt: -1 }),

      Parent.find()
        .populate(
          "student",
          "name email branch section mentor"
        )
        .sort({ createdAt: -1 }),

      Attendance.find()
        .populate(
          "student",
          "name email branch section"
        )
        .populate(
          "mentor",
          "name email"
        )
        .sort({ date: -1 }),

      Mark.find()
        .populate(
          "student",
          "name email branch section"
        )
        .populate(
          "mentor",
          "name email"
        )
        .sort({ createdAt: -1 }),

      Fee.find()
        .populate(
          "student",
          "name email branch section"
        )
        .sort({ createdAt: -1 }),

      LeaveLetter.find()
        .populate(
          "student",
          "name email branch section"
        )
        .populate(
          "mentor",
          "name email"
        )
        .sort({ createdAt: -1 }),

      Issue.find()
        .populate(
          "student",
          "name email branch section"
        )
        .populate(
          "mentor",
          "name email"
        )
        .sort({ createdAt: -1 }),
    ]);

    // =====================================================
    // USERS BY ROLE
    // =====================================================

    const students = users.filter(
      (user) => user.role === "STUDENT"
    );

    const mentors = users.filter(
      (user) => user.role === "MENTOR"
    );

    const admins = users.filter(
      (user) => user.role === "ADMIN"
    );

    // =====================================================
    // FEE CALCULATIONS
    // =====================================================

    const totalFee = fees.reduce(
      (sum, fee) =>
        sum + Number(fee.totalAmount || 0),
      0
    );

    const totalPaid = fees.reduce(
      (sum, fee) =>
        sum + Number(fee.paidAmount || 0),
      0
    );

    const totalDue =
      totalFee - totalPaid;

    // =====================================================
    // ATTENDANCE
    // =====================================================

    const presentCount =
      attendance.filter(
        (record) =>
          record.status === "PRESENT"
      ).length;

    const absentCount =
      attendance.filter(
        (record) =>
          record.status === "ABSENT"
      ).length;

    // =====================================================
    // RESPONSE
    // =====================================================

    res.json({
      message:
        "Admin dashboard data loaded successfully",

      summary: {
        totalUsers: users.length,

        totalStudents:
          students.length,

        totalMentors:
          mentors.length,

        totalParents:
          parents.length,

        totalAdmins:
          admins.length,

        totalAttendanceRecords:
          attendance.length,

        presentCount,

        absentCount,

        totalMarksRecords:
          marks.length,

        totalFee,

        totalPaid,

        totalDue,

        totalLeaveRequests:
          leaves.length,

        totalIssues:
          issues.length,
      },

      users,

      students,

      mentors,

      parents,

      admins,

      attendance,

      marks,

      fees,

      leaves,

      issues,
    });
  } catch (error) {
    console.error(
      "Admin dashboard error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to load admin dashboard",

      error: error.message,
    });
  }
});

// =====================================================
// GET ALL USERS
// GET /api/admin/users
// =====================================================

router.get("/users", async (req, res) => {
  try {
    const users = await User.find(
      {},
      "name email role branch section createdAt"
    ).sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error(
      "Get users error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to get users",

      error: error.message,
    });
  }
});

// =====================================================
// GET ALL STUDENTS
// GET /api/admin/students
// =====================================================
// GET ADMIN STATS SUMMARY
// GET /api/admin/stats
// =====================================================

router.get("/stats", async (req, res) => {
  try {
    const [totalStudents, assignedStudents, unassignedStudents, totalMentors, totalParents, totalAdmins] = await Promise.all([
      User.countDocuments({ role: "STUDENT" }),
      User.countDocuments({ role: "STUDENT", mentor: { $ne: null } }),
      User.countDocuments({ role: "STUDENT", mentor: null }),
      User.countDocuments({ role: "MENTOR" }),
      Parent.countDocuments(),
      User.countDocuments({ role: "ADMIN" }),
    ]);

    res.json({
      totalStudents,
      assignedStudents,
      unassignedStudents,
      totalMentors,
      totalParents,
      totalAdmins,
      totalUsers: totalStudents + totalMentors + totalParents + totalAdmins,
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({
      message: "Failed to get stats",
      error: error.message,
    });
  }
});

// =====================================================
// GET ALL STUDENTS (WITH POPULATED MENTOR & STATUS)
// GET /api/admin/students
// =====================================================

router.get(
  "/students",
  async (req, res) => {
    try {
      const students = await User.find(
        { role: "STUDENT" },
        "name email role branch section mentor createdAt"
      )
        .populate("mentor", "name email branch section")
        .sort({ name: 1 });

      const mappedStudents = students.map((s) => ({
        _id: s._id,
        id: s._id,
        name: s.name,
        email: s.email,
        role: s.role,
        branch: s.branch,
        section: s.section,
        mentor: s.mentor,
        isAssigned: Boolean(s.mentor),
        assignmentStatus: s.mentor ? "Assigned" : "Unassigned",
        createdAt: s.createdAt,
      }));

      res.json(mappedStudents);
    } catch (error) {
      console.error(
        "Get students error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to get students",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET ALL MENTORS (WITH ASSIGNED STUDENTS & COUNTS)
// GET /api/admin/mentors
// =====================================================

router.get(
  "/mentors",
  async (req, res) => {
    try {
      const mentors = await User.find(
        { role: "MENTOR" },
        "name email role branch section createdAt"
      ).sort({ name: 1 });

      // Fetch assigned students for all mentors
      const mentorsWithStudents = await Promise.all(
        mentors.map(async (mentor) => {
          const assignedStudents = await User.find(
            { role: "STUDENT", mentor: mentor._id },
            "name email branch section createdAt"
          ).sort({ name: 1 });

          return {
            _id: mentor._id,
            id: mentor._id,
            name: mentor.name,
            email: mentor.email,
            role: mentor.role,
            branch: mentor.branch,
            section: mentor.section,
            createdAt: mentor.createdAt,
            assignedCount: assignedStudents.length,
            assignedStudents: assignedStudents,
          };
        })
      );

      res.json(mentorsWithStudents);
    } catch (error) {
      console.error(
        "Get mentors error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to get mentors",
        error: error.message,
      });
    }
  }
);

// =====================================================
// CREATE MENTOR ACCOUNT (ADMIN ONLY)
// POST /api/admin/mentors
// =====================================================

router.post("/mentors", async (req, res) => {
  try {
    const { name, email, password, branch, section } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Mentor name, email, and password are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Check duplicate email across User and Parent
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        message: "A user account with this email address already exists",
      });
    }

    const existingParent = await Parent.findOne({ email: cleanEmail });
    if (existingParent) {
      return res.status(400).json({
        message: "A parent account with this email address already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const mentor = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: "MENTOR",
      branch: (branch || "").trim().toUpperCase(),
      section: (section || "").trim().toUpperCase(),
    });

    res.status(201).json({
      message: "Mentor account created successfully",
      mentor: {
        _id: mentor._id,
        id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        role: mentor.role,
        branch: mentor.branch,
        section: mentor.section,
        assignedCount: 0,
        assignedStudents: [],
      },
    });
  } catch (error) {
    console.error("Create mentor error:", error);
    res.status(500).json({
      message: "Failed to create mentor account",
      error: error.message,
    });
  }
});

// =====================================================
// ASSIGN / REASSIGN / UNASSIGN STUDENT TO MENTOR
// PUT /api/admin/students/:studentId/assign-mentor
// =====================================================

router.put("/students/:studentId/assign-mentor", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { mentorId } = req.body;

    const student = await User.findOne({
      _id: studentId,
      role: "STUDENT",
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    // If mentorId is provided and not "unassign"
    if (mentorId && mentorId !== "unassign" && mentorId !== "null" && mentorId !== "") {
      const mentor = await User.findOne({
        _id: mentorId,
        role: "MENTOR",
      });

      if (!mentor) {
        return res.status(404).json({
          message: "Mentor not found",
        });
      }

      student.mentor = mentor._id;
      await student.save();

      const populatedStudent = await User.findById(student._id).populate(
        "mentor",
        "name email branch section"
      );

      return res.json({
        message: `Student successfully assigned to mentor ${mentor.name}`,
        student: {
          _id: populatedStudent._id,
          id: populatedStudent._id,
          name: populatedStudent.name,
          email: populatedStudent.email,
          role: populatedStudent.role,
          branch: populatedStudent.branch,
          section: populatedStudent.section,
          mentor: populatedStudent.mentor,
          isAssigned: true,
          assignmentStatus: "Assigned",
        },
      });
    } else {
      // Unassign student
      student.mentor = null;
      await student.save();

      return res.json({
        message: "Student successfully unassigned from mentor",
        student: {
          _id: student._id,
          id: student._id,
          name: student.name,
          email: student.email,
          role: student.role,
          branch: student.branch,
          section: student.section,
          mentor: null,
          isAssigned: false,
          assignmentStatus: "Unassigned",
        },
      });
    }
  } catch (error) {
    console.error("Assign mentor error:", error);
    res.status(500).json({
      message: "Failed to update student mentor assignment",
      error: error.message,
    });
  }
});

// =====================================================
// GET ALL PARENTS
// GET /api/admin/parents
// =====================================================

router.get(
  "/parents",
  async (req, res) => {
    try {
      const parents =
        await Parent.find()
          .populate(
            "student",
            "name email branch section"
          )
          .sort({ name: 1 });

      res.json(parents);
    } catch (error) {
      console.error(
        "Get parents error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to get parents",

        error: error.message,
      });
    }
  }
);

// =====================================================
// CREATE USER
// POST /api/admin/users
// =====================================================

router.post(
  "/users",
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role,
        branch,
        section,
      } = req.body;

      if (
        !name ||
        !email ||
        !password ||
        !role
      ) {
        return res.status(400).json({
          message:
            "Name, email, password and role are required",
        });
      }

      const allowedRoles = [
        "ADMIN",
        "MENTOR",
        "STUDENT",
        "PARENT",
      ];

      const normalizedRole = String(role).toUpperCase();

      if (!allowedRoles.includes(normalizedRole)) {
        return res.status(400).json({
          message:
            "Invalid role. Must be ADMIN, MENTOR, STUDENT, or PARENT",
        });
      }

      const normalizedEmail =
        email.toLowerCase().trim();

      const existingUser =
        await User.findOne({
          email: normalizedEmail,
        });

      if (existingUser) {
        return res.status(400).json({
          message:
            "User with this email already exists",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const user =
        await User.create({
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          role: normalizedRole,
          branch: branch || "",
          section: section || "",
        });

      res.status(201).json({
        message:
          "User created successfully",

        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          branch: user.branch,
          section: user.section,
        },
      });
    } catch (error) {
      console.error(
        "Create user error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create user",

        error: error.message,
      });
    }
  }
);

// =====================================================
// UPDATE USER
// PUT /api/admin/users/:id
// =====================================================

router.put(
  "/users/:id",
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role,
        branch,
        section,
      } = req.body;

      // -----------------------------------------------
      // FIND USER
      // -----------------------------------------------

      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      // -----------------------------------------------
      // UPDATE NAME
      // -----------------------------------------------

      if (
        name !== undefined
      ) {
        user.name =
          name.trim();
      }

      // -----------------------------------------------
      // UPDATE EMAIL
      // -----------------------------------------------

      if (
        email !== undefined
      ) {
        const normalizedEmail =
          email
            .toLowerCase()
            .trim();

        const existingUser =
          await User.findOne({
            email:
              normalizedEmail,

            _id: {
              $ne: user._id,
            },
          });

        if (existingUser) {
          return res.status(400).json({
            message:
              "Another user already uses this email",
          });
        }

        user.email =
          normalizedEmail;
      }

      // -----------------------------------------------
      // UPDATE PASSWORD
      // -----------------------------------------------

      if (
        password !== undefined &&
        password !== ""
      ) {
        user.password =
          await bcrypt.hash(
            password,
            10
          );
      }

      // -----------------------------------------------
      // UPDATE ROLE
      // -----------------------------------------------

      if (
        role !== undefined
      ) {
        const allowedRoles = [
          "ADMIN",
          "MENTOR",
          "STUDENT",
          "PARENT",
        ];

        const normalizedRole = String(role).toUpperCase();

        if (!allowedRoles.includes(normalizedRole)) {
          return res.status(400).json({
            message:
              "Invalid role. Must be ADMIN, MENTOR, STUDENT, or PARENT",
          });
        }

        user.role = normalizedRole;
      }

      // -----------------------------------------------
      // UPDATE BRANCH
      // -----------------------------------------------

      if (
        branch !== undefined
      ) {
        user.branch =
          branch;
      }

      // -----------------------------------------------
      // UPDATE SECTION
      // -----------------------------------------------

      if (
        section !== undefined
      ) {
        user.section =
          section;
      }

      // -----------------------------------------------
      // SAVE
      // -----------------------------------------------

      await user.save();

      // -----------------------------------------------
      // RESPONSE
      // -----------------------------------------------

      res.json({
        message:
          "User updated successfully",

        user: {
          _id: user._id,

          name: user.name,

          email: user.email,

          role: user.role,

          branch:
            user.branch,

          section:
            user.section,
        },
      });
    } catch (error) {
      console.error(
        "Update user error:",
        error
      );

      // Invalid MongoDB ID
      if (
        error.name ===
        "CastError"
      ) {
        return res.status(400).json({
          message:
            "Invalid user ID",
        });
      }

      res.status(500).json({
        message:
          "Failed to update user",

        error: error.message,
      });
    }
  }
);

// =====================================================
// DELETE USER
// DELETE /api/admin/users/:id
// =====================================================

router.delete(
  "/users/:id",
  async (req, res) => {
    try {
      const user =
        await User.findByIdAndDelete(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      res.json({
        message:
          "User deleted successfully",

        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error(
        "Delete user error:",
        error
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res.status(400).json({
          message:
            "Invalid user ID",
        });
      }

      res.status(500).json({
        message:
          "Failed to delete user",

        error: error.message,
      });
    }
  }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;