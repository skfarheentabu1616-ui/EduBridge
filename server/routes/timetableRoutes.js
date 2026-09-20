const express = require("express");
const router = express.Router();

const Timetable = require("../models/Timetable");

// =====================================================
// CREATE TIMETABLE
// POST /api/timetable
// =====================================================

router.post("/", async (req, res) => {
  try {
    let {
      branch,
      section,
      day,
      period,
      startTime,
      endTime,
      subject,
      mentor,
      room,
      createdBy,
    } = req.body;

    if (
      !branch ||
      !section ||
      !day ||
      period === undefined ||
      period === null ||
      !startTime ||
      !endTime ||
      !subject ||
      !mentor
    ) {
      return res.status(400).json({
        message: "Please provide all required timetable fields",
      });
    }

    const normalizedDay = day
      ? day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()
      : "Monday";

    const periodNum = Number(period) || 1;

    const timetable = await Timetable.findOneAndUpdate(
      {
        branch,
        section,
        day: normalizedDay,
        period: periodNum,
      },
      {
        branch,
        section,
        day: normalizedDay,
        period: periodNum,
        startTime,
        endTime,
        subject,
        mentor,
        room: room || "",
        createdBy: createdBy || mentor,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    )
      .populate("mentor", "name email branch section")
      .populate("createdBy", "name email role");

    res.status(201).json({
      message: "Timetable period saved successfully",
      timetable,
    });
  } catch (error) {
    console.error("CREATE TIMETABLE ERROR:", error);

    res.status(500).json({
      message: "Failed to save timetable",
      error: error.message,
    });
  }
});

// =====================================================
// GET ALL TIMETABLES
// GET /api/timetable
// =====================================================

router.get("/", async (req, res) => {
  try {
    const timetable = await Timetable.find()
      .populate("mentor", "name email branch section")
      .populate("createdBy", "name email role")
      .sort({
        branch: 1,
        section: 1,
        day: 1,
        period: 1,
      });

    res.json({
      message: "Timetable loaded successfully",
      timetable,
    });
  } catch (error) {
    console.error("GET TIMETABLE ERROR:", error);

    res.status(500).json({
      message: "Failed to load timetable",
      error: error.message,
    });
  }
});

// =====================================================
// GET STUDENT/CLASS TIMETABLE
// GET /api/timetable/class/:branch/:section
// =====================================================

router.get(
  "/class/:branch/:section",
  async (req, res) => {
    try {
      const { branch, section } = req.params;

      const timetable = await Timetable.find({
        branch,
        section,
      })
        .populate(
          "mentor",
          "name email branch section"
        )
        .sort({
          day: 1,
          period: 1,
        });

      res.json({
        message:
          "Class timetable loaded successfully",
        branch,
        section,
        timetable,
      });
    } catch (error) {
      console.error(
        "GET CLASS TIMETABLE ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load class timetable",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET MENTOR TIMETABLE
// GET /api/timetable/mentor/:mentorId
// =====================================================

router.get(
  "/mentor/:mentorId",
  async (req, res) => {
    try {
      const timetable = await Timetable.find({
        mentor: req.params.mentorId,
      })
        .populate(
          "mentor",
          "name email branch section"
        )
        .sort({
          day: 1,
          period: 1,
        });

      res.json({
        message:
          "Mentor timetable loaded successfully",
        timetable,
      });
    } catch (error) {
      console.error(
        "GET MENTOR TIMETABLE ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load mentor timetable",
        error: error.message,
      });
    }
  }
);

// =====================================================
// UPDATE TIMETABLE
// PUT /api/timetable/:id
// =====================================================

router.put("/:id", async (req, res) => {
  try {
    const allowedFields = [
      "branch",
      "section",
      "day",
      "period",
      "startTime",
      "endTime",
      "subject",
      "mentor",
      "room",
      "createdBy",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const timetable =
      await Timetable.findByIdAndUpdate(
        req.params.id,
        updates,
        {
          new: true,
          runValidators: true,
        }
      )
        .populate(
          "mentor",
          "name email branch section"
        )
        .populate(
          "createdBy",
          "name email role"
        );

    if (!timetable) {
      return res.status(404).json({
        message: "Timetable not found",
      });
    }

    res.json({
      message: "Timetable updated successfully",
      timetable,
    });
  } catch (error) {
    console.error(
      "UPDATE TIMETABLE ERROR:",
      error
    );

    res.status(500).json({
      message: "Failed to update timetable",
      error: error.message,
    });
  }
});

// =====================================================
// DELETE TIMETABLE
// DELETE /api/timetable/:id
// =====================================================

router.delete("/:id", async (req, res) => {
  try {
    const timetable =
      await Timetable.findByIdAndDelete(
        req.params.id
      );

    if (!timetable) {
      return res.status(404).json({
        message: "Timetable not found",
      });
    }

    res.json({
      message: "Timetable deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE TIMETABLE ERROR:",
      error
    );

    res.status(500).json({
      message: "Failed to delete timetable",
      error: error.message,
    });
  }
});

module.exports = router;