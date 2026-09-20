
const express = require("express");
const Mark = require("../models/Marks");
const User = require("../models/User");

const router = express.Router();

// =====================================================
// HELPER
// =====================================================
// HELPER
// Verify mentor + student exist
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
// ADD MARKS
// POST /api/marks
// =====================================================

router.post("/", async (req, res) => {
  try {
    const {
      student,
      mentor,
      subject,
      exam,
      marksObtained,
      maxMarks,
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

    if (
      !studentId ||
      !mentorId ||
      !subject ||
      !exam ||
      marksObtained === undefined ||
      maxMarks === undefined ||
      marksObtained === null ||
      maxMarks === null ||
      marksObtained === "" ||
      maxMarks === ""
    ) {
      return res.status(400).json({
        message: "Please provide student, mentor, subject, exam, marks obtained, and maximum marks",
      });
    }

    const obtained = Number(marksObtained);
    const maximum = Number(maxMarks);

    if (!Number.isFinite(obtained) || !Number.isFinite(maximum)) {
      return res.status(400).json({
        message: "Marks must be valid numbers",
      });
    }

    if (maximum <= 0) {
      return res.status(400).json({
        message: "Maximum marks must be greater than 0",
      });
    }

    if (obtained < 0) {
      return res.status(400).json({
        message: "Marks obtained cannot be negative",
      });
    }

    if (obtained > maximum) {
      return res.status(400).json({
        message: `Marks obtained (${obtained}) cannot exceed maximum marks (${maximum})`,
      });
    }

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
    // CREATE MARKS
    // -----------------------------------------------

    const mark = await Mark.create({
      student: studentId,
      mentor: mentorId,
      subject: subject.trim(),
      exam: exam.trim(),
      marksObtained: obtained,
      maxMarks: maximum,
    });

    const populatedMark = await Mark.findById(mark._id)
      .populate("student", "name email branch section")
      .populate("mentor", "name email branch section");

    res.status(201).json({
      message: "Marks added successfully",
      mark: populatedMark,
    });
  } catch (error) {
    console.error("Add marks error:", error);

    res.status(500).json({
      message: "Failed to add marks",
      error: error.message,
    });
  }
});

// =====================================================
// GET STUDENT MARKS
// GET /api/marks/student/:studentId
// =====================================================

router.get(
  "/student/:studentId",
  async (req, res) => {
    try {
      const student =
        await User.findOne({
          _id:
            req.params.studentId,
          role: "STUDENT",
        });

      if (!student) {
        return res.status(404).json({
          message:
            "Student not found",
        });
      }

      const marks =
        await Mark.find({
          student:
            req.params.studentId,
        })
          .populate(
            "student",
            "name email branch section"
          )
          .populate(
            "mentor",
            "name email branch section"
          )
          .sort({
            createdAt: -1,
          });

      res.json(marks);
    } catch (error) {
      console.error(
        "Get student marks error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to get student marks",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET MARKS
// GET /api/marks
// =====================================================

router.get("/", async (req, res) => {
  try {
    const marks =
      await Mark.find()
        .populate(
          "student",
          "name email branch section"
        )
        .populate(
          "mentor",
          "name email branch section"
        )
        .sort({
          createdAt: -1,
        });

    res.json(marks);
  } catch (error) {
    console.error(
      "Get marks error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to get marks",
      error: error.message,
    });
  }
});

// =====================================================
// UPDATE MARKS
// PUT /api/marks/:markId
// =====================================================

router.put(
  "/:markId",
  async (req, res) => {
    try {
      const {
        marksObtained,
        maxMarks,
      } = req.body;

      const mark =
        await Mark.findById(
          req.params.markId
        );

      if (!mark) {
        return res.status(404).json({
          message:
            "Mark record not found",
        });
      }

      // ---------------------------------------------
      // VERIFY EXISTING RECORD BELONGS TO AIML-A
      // ---------------------------------------------

      const access =
        await verifyAIMLAAccess(
          mark.mentor,
          mark.student
        );

      if (!access.valid) {
        return res.status(403).json({
          message:
            access.message,
        });
      }

      // ---------------------------------------------
      // UPDATE VALUES
      // ---------------------------------------------

      if (
        marksObtained !==
        undefined
      ) {
        mark.marksObtained =
          Number(
            marksObtained
          );
      }

      if (
        maxMarks !== undefined
      ) {
        mark.maxMarks =
          Number(maxMarks);
      }

      if (
        !Number.isFinite(
          mark.marksObtained
        ) ||
        !Number.isFinite(
          mark.maxMarks
        ) ||
        mark.maxMarks <= 0 ||
        mark.marksObtained < 0 ||
        mark.marksObtained >
          mark.maxMarks
      ) {
        return res.status(400).json({
          message:
            "Invalid marks",
        });
      }

      await mark.save();

      const updatedMark =
        await Mark.findById(
          mark._id
        )
          .populate(
            "student",
            "name email branch section"
          )
          .populate(
            "mentor",
            "name email branch section"
          );

      res.json({
        message:
          "Marks updated successfully",
        section: "AIML-A",
        mark: updatedMark,
      });
    } catch (error) {
      console.error(
        "Update marks error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update marks",
        error: error.message,
      });
    }
  }
);

// =====================================================
// DELETE MARKS
// DELETE /api/marks/:markId
// =====================================================

router.delete(
  "/:markId",
  async (req, res) => {
    try {
      const mark =
        await Mark.findById(
          req.params.markId
        );

      if (!mark) {
        return res.status(404).json({
          message:
            "Mark record not found",
        });
      }

      // ---------------------------------------------
      // VERIFY RECORD BELONGS TO AIML-A
      // ---------------------------------------------

      const access =
        await verifyAIMLAAccess(
          mark.mentor,
          mark.student
        );

      if (!access.valid) {
        return res.status(403).json({
          message:
            access.message,
        });
      }

      await Mark.findByIdAndDelete(
        req.params.markId
      );

      res.json({
        message:
          "Marks deleted successfully",
        section: "AIML-A",
      });
    } catch (error) {
      console.error(
        "Delete marks error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete marks",
        error: error.message,
      });
    }
  }
);

module.exports = router;

