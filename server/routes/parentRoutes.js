
const express = require("express");
const bcrypt = require("bcryptjs");
const Parent = require("../models/Parent");
const User = require("../models/User");

const router = express.Router();

// ==========================================
// PARENT REGISTER
// ==========================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      studentId,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !studentId
    ) {
      return res.status(400).json({
        message:
          "Name, email, password and studentId are required",
      });
    }

    // Check student
    const student = await User.findOne({
      _id: studentId,
      role: "STUDENT",
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    // Check existing parent
    const existingParent =
      await Parent.findOne({
        email: email.toLowerCase(),
      });

    if (existingParent) {
      return res.status(400).json({
        message:
          "Parent email already exists",
      });
    }

    // Hash password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    const parent = await Parent.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "PARENT",
      student: studentId,
    });

    res.status(201).json({
      message:
        "Parent registered successfully",
      parent: {
        id: parent._id,
        name: parent.name,
        email: parent.email,
        role: parent.role,
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
        },
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        "Parent registration failed",
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

