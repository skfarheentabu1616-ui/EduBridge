
const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Parent = require("../models/Parent");
const User = require("../models/User");

const router = express.Router();

// ==========================================
// PARENT REGISTER
// POST /api/parent/register
// ==========================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      studentId,
      studentEmail,
    } = req.body;

    const studentRef = studentEmail || studentId;

    if (!name || !email || !password || !studentRef) {
      return res.status(400).json({
        message: "Please provide parent name, email, password, and student email/ID",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please provide a valid parent email address",
      });
    }

    // Password length check
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Check student existence by email or MongoDB ObjectId
    let student = null;
    const cleanStudentRef = String(studentRef).trim();

    if (emailRegex.test(cleanStudentRef.toLowerCase())) {
      student = await User.findOne({
        email: cleanStudentRef.toLowerCase(),
        role: "STUDENT",
      });
    }

    if (!student && mongoose.Types.ObjectId.isValid(cleanStudentRef)) {
      student = await User.findOne({
        _id: cleanStudentRef,
        role: "STUDENT",
      });
    }

    if (!student) {
      return res.status(404).json({
        message: "Student account not found with the provided email or ID. Please ensure the student is already registered.",
      });
    }

    // Check existing parent
    const existingParent = await Parent.findOne({
      email: cleanEmail,
    });

    if (existingParent) {
      return res.status(400).json({
        message: "An account with this parent email already exists",
      });
    }

    // Check collision with User collection
    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "This email address is already registered as a college user account",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const parent = await Parent.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: "PARENT",
      student: student._id,
    });

    const token = "parent-token";

    res.status(201).json({
      message: "Parent account registered successfully",
      token,
      user: {
        _id: parent._id,
        id: parent._id,
        name: parent.name,
        email: parent.email,
        role: parent.role,
        student: {
          _id: student._id,
          id: student._id,
          name: student.name,
          email: student.email,
          branch: student.branch,
          section: student.section,
        },
      },
    });
  } catch (error) {
    console.error("Parent registration error:", error);

    res.status(500).json({
      message: "Parent registration failed",
      error: error.message,
    });
  }
});

// ==========================================
// PARENT LOGIN
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
          "Email and password are required",
      });
    }

    const parent =
      await Parent.findOne({
        email: email.toLowerCase(),
      }).populate(
        "student",
        "name email role branch section"
      );

    if (!parent) {
      return res.status(401).json({
        message:
          "Invalid parent email or password",
      });
    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        parent.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message:
          "Invalid parent email or password",
      });
    }

    res.json({
      message: "Login successful",
      user: {
        _id: parent._id,
        id: parent._id,
        name: parent.name,
        email: parent.email,
        role: parent.role || "PARENT",
        student: parent.student,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        "Parent login failed",
    });
  }
});

module.exports = router;

