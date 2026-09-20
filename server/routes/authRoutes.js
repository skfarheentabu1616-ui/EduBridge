
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Parent = require("../models/Parent");

const router = express.Router();

// ==========================================
// REGISTER (Student Public Registration)
// POST /api/auth/register
// ==========================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      branch,
      section,
    } = req.body;

    if (!name || !email || !password || !branch || !section) {
      return res.status(400).json({
        message: "Please provide all required fields: name, email, password, branch, and section",
      });
    }

    // Role check: Only STUDENT role allowed for public registration
    const targetRole = String(role || "STUDENT").toUpperCase();
    if (targetRole !== "STUDENT") {
      return res.status(403).json({
        message: "Public registration is only permitted for Student accounts. Mentor and Admin accounts are created by administrators.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Check duplicate in User collection
    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email address already exists",
      });
    }

    // Check duplicate in Parent collection
    const existingParent = await Parent.findOne({
      email: cleanEmail,
    });

    if (existingParent) {
      return res.status(400).json({
        message: "This email address is already registered as a Parent account",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: "STUDENT",
      branch: branch.trim().toUpperCase(),
      section: section.trim().toUpperCase(),
    });

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET || "edubridge_secret_2026",
      {
        expiresIn: "1d",
      }
    );

    res.status(201).json({
      message: "Student account registered successfully",
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        section: user.section,
      },
    });
  } catch (error) {
    console.error("Student registration error:", error);

    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
});

// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Please provide email and password",
      });
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordValid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET ||
        "edubridge-secret",
      {
        expiresIn: "1d",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        section: user.section,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
});

// ==========================================
// GET ALL STUDENTS
// GET /api/auth/students
// ==========================================

router.get("/students", async (req, res) => {
  try {
    const students = await User.find(
      {
        role: "STUDENT",
      },
      "name email branch section"
    ).sort({
      name: 1,
    });

    res.json(students);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get students",
      error: error.message,
    });
  }
});

// ==========================================
// GET AIML-A STUDENTS
// GET /api/auth/students/aiml-a
// ==========================================

router.get(
  "/students/aiml-a",
  async (req, res) => {
    try {
      const students = await User.find(
        {
          role: "STUDENT",
          branch: "AIML",
          section: "AIML-A",
        },
        "name email branch section"
      ).sort({
        name: 1,
      });

      res.json(students);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Failed to get AIML-A students",
        error: error.message,
      });
    }
  }
);

// ==========================================
// ASSIGN STUDENT TO BRANCH + SECTION
// PUT /api/auth/students/:id/section
// ==========================================

router.put(
  "/students/:id/section",
  async (req, res) => {
    try {
      const {
        branch,
        section,
      } = req.body;

      if (!branch || !section) {
        return res.status(400).json({
          message:
            "Branch and section are required",
        });
      }

      const student =
        await User.findOneAndUpdate(
          {
            _id: req.params.id,
            role: "STUDENT",
          },
          {
            branch,
            section,
          },
          {
            new: true,
          }
        );

      if (!student) {
        return res.status(404).json({
          message:
            "Student not found",
        });
      }

      res.json({
        message:
          "Student assigned successfully",
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          role: student.role,
          branch: student.branch,
          section: student.section,
        },
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Failed to assign student",
        error: error.message,
      });
    }
  }
);

// ==========================================
// ASSIGN MENTOR TO BRANCH + SECTION
// PUT /api/auth/mentor/:id/section
// ==========================================

router.put(
  "/mentor/:id/section",
  async (req, res) => {
    try {
      const {
        branch,
        section,
      } = req.body;

      if (!branch || !section) {
        return res.status(400).json({
          message:
            "Branch and section are required",
        });
      }

      const mentor =
        await User.findOneAndUpdate(
          {
            _id: req.params.id,
            role: "MENTOR",
          },
          {
            branch,
            section,
          },
          {
            new: true,
          }
        );

      if (!mentor) {
        return res.status(404).json({
          message:
            "Mentor not found",
        });
      }

      res.json({
        message:
          "Mentor assigned successfully",
        mentor: {
          id: mentor._id,
          name: mentor.name,
          email: mentor.email,
          role: mentor.role,
          branch: mentor.branch,
          section: mentor.section,
        },
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Failed to assign mentor",
        error: error.message,
      });
    }
  }
);

// ==========================================
// GET ALL MENTORS
// GET /api/auth/mentors
// ==========================================

router.get("/mentors", async (req, res) => {
  try {
    const mentors = await User.find(
      {
        role: "MENTOR",
      },
      "name email branch section"
    ).sort({
      name: 1,
    });

    res.json(mentors);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get mentors",
      error: error.message,
    });
  }
});

// ==========================================
// GET AIML-A MENTORS
// GET /api/auth/mentors/aiml-a
// ==========================================

router.get(
  "/mentors/aiml-a",
  async (req, res) => {
    try {
      const mentors = await User.find(
        {
          role: "MENTOR",
          branch: "AIML",
          section: "AIML-A",
        },
        "name email branch section"
      ).sort({
        name: 1,
      });

      res.json(mentors);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Failed to get AIML-A mentors",
        error: error.message,
      });
    }
  }
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;

