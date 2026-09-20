const express = require("express");
const router = express.Router();

const Observation = require("../models/Observation");
const User = require("../models/User");

/*
  ADD OBSERVATION
  Mentor creates observation for a student
*/
router.post("/", async (req, res) => {
  try {
    const {
      student,
      mentor,
      title,
      description,
      category,
      priority,
      date,
    } = req.body;

    const studentId =
      student && typeof student === "object"
        ? student._id || student.id
        : student;

    const mentorId =
      mentor && typeof mentor === "object"
        ? mentor._id || mentor.id
        : mentor;

    if (!studentId || !mentorId || !description) {
      return res.status(400).json({
        message:
          "Student, mentor and description are required",
      });
    }

    const studentUser = await User.findById(studentId);

    if (!studentUser) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    const mentorUser = await User.findById(mentorId);

    if (!mentorUser) {
      return res.status(404).json({
        message: "Mentor not found",
      });
    }

    const observationTitle =
      (title && title.trim()) ||
      (category && category !== "GENERAL"
        ? `${category} Observation`
        : "Classroom Observation");

    const observation = await Observation.create({
      student: studentId,
      mentor: mentorId,
      title: observationTitle,
      description: description.trim(),
      category: category ? String(category).toUpperCase().trim() : "GENERAL",
      priority: priority || "MEDIUM",
      date: date ? new Date(date) : new Date(),
    });

    const populatedObservation =
      await Observation.findById(
        observation._id
      )
        .populate(
          "student",
          "name email branch section"
        )
        .populate(
          "mentor",
          "name email branch section"
        );

    res.status(201).json({
      message: "Observation added successfully",
      observation: populatedObservation,
    });
  } catch (error) {
    console.error(
      "Add observation error:",
      error
    );

    res.status(500).json({
      message: "Failed to add observation",
      error: error.message,
    });
  }
});


/*
  GET ALL OBSERVATIONS
  Admin / Mentor use
*/
router.get("/", async (req, res) => {
  try {
    const observations =
      await Observation.find()
        .populate(
          "student",
          "name email branch section"
        )
        .populate(
          "mentor",
          "name email branch section"
        )
        .sort({ date: -1 });

    res.json({
      message:
        "Observations loaded successfully",
      observations,
    });
  } catch (error) {
    console.error(
      "Get observations error:",
      error
    );

    res.status(500).json({
      message: "Failed to load observations",
      error: error.message,
    });
  }
});


/*
  GET OBSERVATIONS FOR ONE STUDENT

  Student login/dashboard can use:
  /api/observations/student/:studentId
*/
router.get(
  "/student/:studentId",
  async (req, res) => {
    try {
      const observations =
        await Observation.find({
          student: req.params.studentId,
        })
          .populate(
            "student",
            "name email branch section"
          )
          .populate(
            "mentor",
            "name email branch section"
          )
          .sort({ date: -1 });

      res.json({
        message:
          "Student observations loaded successfully",
        observations,
      });
    } catch (error) {
      console.error(
        "Student observations error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load student observations",
        error: error.message,
      });
    }
  }
);


/*
  GET OBSERVATIONS CREATED BY ONE MENTOR

  Mentor dashboard can use:
  /api/observations/mentor/:mentorId
*/
router.get(
  "/mentor/:mentorId",
  async (req, res) => {
    try {
      const observations =
        await Observation.find({
          mentor: req.params.mentorId,
        })
          .populate(
            "student",
            "name email branch section"
          )
          .populate(
            "mentor",
            "name email branch section"
          )
          .sort({ date: -1 });

      res.json({
        message:
          "Mentor observations loaded successfully",
        observations,
      });
    } catch (error) {
      console.error(
        "Mentor observations error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load mentor observations",
        error: error.message,
      });
    }
  }
);


/*
  UPDATE OBSERVATION
*/
router.put("/:id", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      date,
    } = req.body;

    const observation =
      await Observation.findByIdAndUpdate(
        req.params.id,
        {
          title,
          description,
          category,
          priority,
          date,
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate(
          "student",
          "name email branch section"
        )
        .populate(
          "mentor",
          "name email branch section"
        );

    if (!observation) {
      return res.status(404).json({
        message: "Observation not found",
      });
    }

    res.json({
      message:
        "Observation updated successfully",
      observation,
    });
  } catch (error) {
    console.error(
      "Update observation error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to update observation",
      error: error.message,
    });
  }
});


/*
  DELETE OBSERVATION
*/
router.delete("/:id", async (req, res) => {
  try {
    const observation =
      await Observation.findByIdAndDelete(
        req.params.id
      );

    if (!observation) {
      return res.status(404).json({
        message: "Observation not found",
      });
    }

    res.json({
      message:
        "Observation deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete observation error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete observation",
      error: error.message,
    });
  }
});


module.exports = router;