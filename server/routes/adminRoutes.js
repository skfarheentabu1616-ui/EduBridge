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
        "name email role branch section createdAt"
      ).sort({ createdAt: -1 }),

      Parent.find()
        .populate(
          "student",
          "name email branch section"
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

router.get(
  "/students",
  async (req, res) => {
    try {
      const students =
        await User.find(
          { role: "STUDENT" },
          "name email role branch section createdAt"
        ).sort({ name: 1 });

      res.json(students);
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
// GET ALL MENTORS
// GET /api/admin/mentors
// =====================================================

router.get(
  "/mentors",
  async (req, res) => {
    try {
      const mentors =
        await User.find(
          { role: "MENTOR" },
          "name email role branch section createdAt"
        ).sort({ name: 1 });

      res.json(mentors);
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