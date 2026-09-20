const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");
const Parent = require("./models/Parent");
const Attendance = require("./models/Attendance");
const Mark = require("./models/Marks");
const Fee = require("./models/Fee");
const LeaveLetter = require("./models/LeaveLetter");
const Issue = require("./models/Issue");
const Observation = require("./models/Observation");
const Timetable = require("./models/Timetable");
const Holiday = require("./models/Holiday");

async function cleanup() {
  console.log("Connecting to MongoDB...");
  const mongoUri =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/edubridge";

  try {
    await mongoose.connect(mongoUri);

    console.log("=== 1. FINDING MAIN DEMO USERS ===");
    const rahul = await User.findOne({ email: "rahul@student.com" });
    const kumar = await User.findOne({ email: "kumar@mentor.com" });
    const admin = await User.findOne({ email: "admin@edubridge.com" });

    if (!rahul || !kumar || !admin) {
      throw new Error("One or more core users missing! Please run seed.js first.");
    }

    console.log(`Rahul Student: ${rahul._id}`);
    console.log(`Kumar Mentor: ${kumar._id}`);
    console.log(`Admin: ${admin._id}`);

    // 2. Identify extra test users
    const allowedEmails = [
      "rahul@student.com",
      "kumar@mentor.com",
      "parent@test.com",
      "admin@edubridge.com",
    ];

    const extraUsers = await User.find({ email: { $nin: allowedEmails } });
    const extraIds = extraUsers.map((u) => u._id);

    console.log("\n=== 2. REMOVING EXTRA TEST USERS ===");
    extraUsers.forEach((u) => {
      console.log(`- Removing user: ${u.name} (${u.email}) [${u.role}]`);
    });

    if (extraIds.length > 0) {
      const attDel = await Attendance.deleteMany({ student: { $in: extraIds } });
      const markDel = await Mark.deleteMany({ student: { $in: extraIds } });
      const feeDel = await Fee.deleteMany({ student: { $in: extraIds } });
      const leaveDel = await LeaveLetter.deleteMany({ student: { $in: extraIds } });
      const issueDel = await Issue.deleteMany({ student: { $in: extraIds } });
      const obsDel = await Observation.deleteMany({ student: { $in: extraIds } });

      console.log(`Deleted orphaned attendance records: ${attDel.deletedCount}`);
      console.log(`Deleted orphaned marks records: ${markDel.deletedCount}`);
      console.log(`Deleted orphaned fee records: ${feeDel.deletedCount}`);
      console.log(`Deleted orphaned leave records: ${leaveDel.deletedCount}`);
      console.log(`Deleted orphaned issue records: ${issueDel.deletedCount}`);
      console.log(`Deleted orphaned observation records: ${obsDel.deletedCount}`);

      const userDel = await User.deleteMany({ _id: { $in: extraIds } });
      console.log(`Deleted extra users: ${userDel.deletedCount}`);
    }

    // 3. Clean up extra Parent records
    const parentDel = await Parent.deleteMany({ email: { $ne: "parent@test.com" } });
    console.log(`Deleted extra parent records: ${parentDel.deletedCount}`);

    // Ensure Parent record in Parent collection
    let parent = await Parent.findOne({ email: "parent@test.com" });
    if (parent) {
      parent.name = "Ramesh (Rahul's Parent)";
      parent.student = rahul._id;
      parent.role = "PARENT";
      await parent.save();
    }

    // Ensure Parent user in User collection
    let parentUser = await User.findOne({ email: "parent@test.com" });
    if (parentUser) {
      parentUser.name = "Ramesh (Rahul's Parent)";
      parentUser.role = "PARENT";
      await parentUser.save();
    }

    // 4. Verify exact state
    console.log("\n=== 3. FINAL DATABASE STATE ===");
    const finalUsers = await User.find().sort({ role: 1 });
    console.log(`Total Users in DB: ${finalUsers.length}`);
    finalUsers.forEach((u, i) => {
      console.log(
        `${i + 1}. ${u.name} - ${u.email} - ${u.role}${
          u.branch ? ` - ${u.branch} - ${u.section}` : ""
        }`
      );
    });

    const finalParents = await Parent.find().populate("student", "name email");
    console.log(`\nTotal Parents in Parent collection: ${finalParents.length}`);
    finalParents.forEach((p) => {
      console.log(`- ${p.name} (${p.email}) -> Linked to: ${p.student?.name}`);
    });

    // 5. Verify Rahul's Academic Records
    console.log("\n=== 4. RAHUL ACADEMIC METRICS ===");
    const rahulAtt = await Attendance.find({ student: rahul._id });
    const present = rahulAtt.filter((a) => a.status === "PRESENT").length;
    const absent = rahulAtt.filter((a) => a.status === "ABSENT").length;
    const pct = rahulAtt.length > 0 ? ((present / rahulAtt.length) * 100).toFixed(1) : "0.0";
    console.log(`Attendance: ${pct}% (${present} present / ${rahulAtt.length} classes)`);

    const rahulMarks = await Mark.find({ student: rahul._id });
    console.log(`Marks: ${rahulMarks.length} examination record(s) -> ${rahulMarks[0]?.marksObtained}/${rahulMarks[0]?.maxMarks}`);

    const rahulFees = await Fee.find({ student: rahul._id });
    const feeTotal = rahulFees.reduce((s, f) => s + f.totalAmount, 0);
    const feePaid = rahulFees.reduce((s, f) => s + f.paidAmount, 0);
    console.log(`Fees: Total ₹${feeTotal}, Paid ₹${feePaid}, Due ₹${feeTotal - feePaid}`);

    const rahulLeaves = await LeaveLetter.find({ student: rahul._id });
    console.log(`Leave Requests: ${rahulLeaves.length}`);

    const rahulIssues = await Issue.find({ student: rahul._id });
    console.log(`Classroom Issues: ${rahulIssues.length}`);

    const rahulObs = await Observation.find({ student: rahul._id });
    console.log(`Observations: ${rahulObs.length}`);

    const ttCount = await Timetable.countDocuments({ branch: "AIML", section: "AIML-A" });
    console.log(`Timetable Periods: ${ttCount}`);

    const holidayCount = await Holiday.countDocuments();
    console.log(`Holidays: ${holidayCount}`);

    console.log("\nCleanup and verification completed successfully! ✅");
  } catch (error) {
    console.error("Cleanup failed ❌", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

cleanup();
