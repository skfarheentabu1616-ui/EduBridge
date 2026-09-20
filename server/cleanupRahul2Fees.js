require("dotenv").config();

const mongoose = require("mongoose");
const Fee = require("./models/Fee");
const User = require("./models/User");

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({
      email: "rahul2@student.com",
    });

    if (!user) {
      throw new Error("Rahul2 student not found");
    }

    const fees = await Fee.find({
      student: user._id,
      totalAmount: 50000,
      paidAmount: 30000,
    }).sort({ createdAt: 1 });

    console.log("Rahul2 matching fees:", fees.length);

    if (fees.length > 1) {
      const duplicates = fees.slice(1);

      await Fee.deleteMany({
        _id: {
          $in: duplicates.map((fee) => fee._id),
        },
      });

      console.log(
        "Deleted duplicate Rahul2 fee records:",
        duplicates.length
      );
    } else {
      console.log("No duplicate Rahul2 fees found.");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Cleanup error:", error);
    process.exit(1);
  }
}

cleanup();