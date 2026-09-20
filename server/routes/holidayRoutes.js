const express = require("express");
const router = express.Router();

const Holiday = require("../models/Holiday");

// =====================================================
// GET ALL HOLIDAYS
// =====================================================

router.get("/", async (req, res) => {
  try {
    const holidays = await Holiday.find()
      .populate(
        "createdBy",
        "name email role"
      )
      .sort({ date: 1 });

    res.json(holidays);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load holidays",
    });
  }
});

// =====================================================
// GET HOLIDAYS BY SECTION
// =====================================================

router.get(
  "/section/:section",
  async (req, res) => {
    try {
      const section =
        req.params.section;

      const holidays =
        await Holiday.find({
          $or: [
            { section: "" },
            {
              section: {
                $regex: `^${section}$`,
                $options: "i",
              },
            },
          ],
        })
          .populate(
            "createdBy",
            "name email role"
          )
          .sort({ date: 1 });

      res.json(holidays);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Failed to load section holidays",
      });
    }
  }
);

// =====================================================
// CREATE HOLIDAY
// =====================================================

router.post("/", async (req, res) => {
  try {
    const {
      title,
      date,
      type,
      description,
      branch,
      section,
      createdBy,
    } = req.body;

    if (!title || !date || !createdBy) {
      return res.status(400).json({
        message:
          "Title, date and createdBy are required",
      });
    }

    const holiday =
      await Holiday.create({
        title,
        date,
        type: type || "COLLEGE",
        description:
          description || "",
        branch: branch || "",
        section: section || "",
        createdBy,
      });

    const populatedHoliday =
      await Holiday.findById(
        holiday._id
      ).populate(
        "createdBy",
        "name email role"
      );

    res.status(201).json({
      message:
        "Holiday added successfully",
      holiday: populatedHoliday,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to add holiday",
    });
  }
});

// =====================================================
// UPDATE HOLIDAY
// =====================================================

router.put(
  "/:id",
  async (req, res) => {
    try {
      const {
        title,
        date,
        type,
        description,
        branch,
        section,
      } = req.body;

      const holiday =
        await Holiday.findByIdAndUpdate(
          req.params.id,
          {
            title,
            date,
            type,
            description,
            branch,
            section,
          },
          {
            new: true,
            runValidators: true,
          }
        ).populate(
          "createdBy",
          "name email role"
        );

      if (!holiday) {
        return res.status(404).json({
          message: "Holiday not found",
        });
      }

      res.json({
        message:
          "Holiday updated successfully",
        holiday,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Failed to update holiday",
      });
    }
  }
);

// =====================================================
// DELETE HOLIDAY
// =====================================================

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const holiday =
        await Holiday.findByIdAndDelete(
          req.params.id
        );

      if (!holiday) {
        return res.status(404).json({
          message: "Holiday not found",
        });
      }

      res.json({
        message:
          "Holiday deleted successfully",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Failed to delete holiday",
      });
    }
  }
);

module.exports = router;