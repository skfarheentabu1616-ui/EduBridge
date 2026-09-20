
const express = require("express");
const Fee = require("../models/Fee");
const User = require("../models/User");

const router = express.Router();

// =====================================================
// HELPER
// Verify student exists
// =====================================================

const verifyStudent = async (studentId) => {
  const student = await User.findOne({
    _id: studentId,
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
    student,
  };
};

// =====================================================
// CREATE / ADD FEE
// POST /api/fees
// =====================================================

router.post("/", async (req, res) => {
  try {
    const {
      student,
      totalAmount,
      paidAmount,
      dueDate,
    } = req.body;

    if (
      !student ||
      totalAmount === undefined ||
      !dueDate
    ) {
      return res.status(400).json({
        message: "Please provide student, total amount, and due date",
      });
    }

    const access = await verifyStudent(student);

    if (!access.valid) {
      return res.status(404).json({
        message: access.message,
      });
    }

    const paid = Number(paidAmount || 0);
    const total = Number(totalAmount);

    if (
      !Number.isFinite(total) ||
      !Number.isFinite(paid) ||
      total <= 0 ||
      paid < 0 ||
      paid > total
    ) {
      return res.status(400).json({
        message: `Invalid fee amount. Total must be > 0 and paid between 0 and ${total}`,
      });
    }

    let status = "PENDING";
    if (paid >= total) {
      status = "PAID";
    } else if (paid > 0) {
      status = "PARTIAL";
    }

    const fee = await Fee.create({
      student,
      totalAmount: total,
      paidAmount: paid,
      dueDate,
      status,
    });

    const populatedFee = await Fee.findById(fee._id).populate(
      "student",
      "name email branch section"
    );

    res.status(201).json({
      message: "Fee record added successfully",
      fee: populatedFee,
    });
  } catch (error) {
    console.error("Add fee error:", error);

    res.status(500).json({
      message: "Failed to add fee",
      error: error.message,
    });
  }
});

// =====================================================
// GET FEES FOR STUDENT
// GET /api/fees/student/:studentId
// =====================================================

router.get("/student/:studentId", async (req, res) => {
  try {
    const fees = await Fee.find({
      student: req.params.studentId,
    })
      .populate("student", "name email branch section")
      .sort({
        createdAt: -1,
      });

    res.json(fees);
  } catch (error) {
    console.error("Get student fees error:", error);

    res.status(500).json({
      message: "Failed to get student fees",
      error: error.message,
    });
  }
});

// =====================================================
// GET ALL FEES
// GET /api/fees
// =====================================================

router.get("/", async (req, res) => {
  try {
    const fees = await Fee.find()
      .populate("student", "name email branch section")
      .sort({
        createdAt: -1,
      });

    res.json(fees);
  } catch (error) {
    console.error("Get fees error:", error);

    res.status(500).json({
      message: "Failed to get fees",
      error: error.message,
    });
  }
});

// =====================================================
// UPDATE FEE PAYMENT
// PUT /api/fees/:feeId
// =====================================================

router.put("/:feeId", async (req, res) => {
  try {
    const { paidAmount } = req.body;

    if (paidAmount === undefined || paidAmount === null) {
      return res.status(400).json({
        message: "Please provide paid amount",
      });
    }

    const fee = await Fee.findById(req.params.feeId);

    if (!fee) {
      return res.status(404).json({
        message: "Fee record not found",
      });
    }

    const paid = Number(paidAmount);
    const total = Number(fee.totalAmount);

    if (!Number.isFinite(paid) || paid < 0 || paid > total) {
      return res.status(400).json({
        message: `Invalid paid amount. Paid amount must be between 0 and total amount (₹${total}).`,
      });
    }

    fee.paidAmount = paid;

    if (paid >= total) {
      fee.status = "PAID";
    } else if (paid > 0) {
      fee.status = "PARTIAL";
    } else {
      fee.status = "PENDING";
    }

    await fee.save();

    const updatedFee = await Fee.findById(fee._id).populate(
      "student",
      "name email branch section"
    );

    res.json({
      message: "Fee payment updated successfully",
      fee: updatedFee,
    });
  } catch (error) {
    console.error("Update fee error:", error);

    res.status(500).json({
      message: "Failed to update fee",
      error: error.message,
    });
  }
});

// =====================================================
// DELETE FEE RECORD
// DELETE /api/fees/:feeId
// =====================================================

router.delete("/:feeId", async (req, res) => {
  try {
    const fee = await Fee.findByIdAndDelete(req.params.feeId);

    if (!fee) {
      return res.status(404).json({
        message: "Fee record not found",
      });
    }

    res.json({
      message: "Fee record deleted successfully",
    });
  } catch (error) {
    console.error("Delete fee error:", error);

    res.status(500).json({
      message: "Failed to delete fee",
      error: error.message,
    });
  }
});

module.exports = router;

