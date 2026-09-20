const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");
const Parent = require("./models/Parent");
const Attendance = require("./models/Attendance");
const Mark = require("./models/Marks");
const Fee = require("./models/Fee");
const Observation = require("./models/Observation");
const LeaveLetter = require("./models/LeaveLetter");
const Issue = require("./models/Issue");
const Holiday = require("./models/Holiday");
const Timetable = require("./models/Timetable");

async function seed() {
  console.log("Connecting to MongoDB...");
  const mongoUri =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/edubridge";

  try {
    await mongoose.connect(mongoUri);

    const hashedStudentPass = await bcrypt.hash("password123", 10);
    const hashedMentorPass = await bcrypt.hash("password123", 10);
    const hashedParentPass = await bcrypt.hash("password123", 10);
    const hashedAdminPass = await bcrypt.hash("admin123", 10);

    // ==========================================
    // 1. CLEANUP EXTRA TEST USERS
    // ==========================================
    const allowedEmails = [
      "rahul@student.com",
      "kumar@mentor.com",
      "parent@test.com",
      "admin@edubridge.com",
    ];

    const extraUsers = await User.find({ email: { $nin: allowedEmails } });
    const extraIds = extraUsers.map((u) => u._id);

    if (extraIds.length > 0) {
      await Attendance.deleteMany({ student: { $in: extraIds } });
      await Mark.deleteMany({ student: { $in: extraIds } });
      await Fee.deleteMany({ student: { $in: extraIds } });
      await LeaveLetter.deleteMany({ student: { $in: extraIds } });
      await Issue.deleteMany({ student: { $in: extraIds } });
      await Observation.deleteMany({ student: { $in: extraIds } });
      await User.deleteMany({ _id: { $in: extraIds } });
    }

    await Parent.deleteMany({ email: { $ne: "parent@test.com" } });

    // ==========================================
    // 2. USERS
    // ==========================================
    // Student: Rahul
    let student = await User.findOne({ email: "rahul@student.com" });
    if (student) {
      student.name = "Rahul Student";
      student.role = "STUDENT";
      student.branch = "AIML";
      student.section = "AIML-A";
      student.password = hashedStudentPass;
      await student.save();
    } else {
      student = await User.create({
        name: "Rahul Student",
        email: "rahul@student.com",
        password: hashedStudentPass,
        role: "STUDENT",
        branch: "AIML",
        section: "AIML-A",
      });
    }

    // Mentor: Kumar
    let mentor = await User.findOne({ email: "kumar@mentor.com" });
    if (mentor) {
      mentor.name = "Kumar Mentor";
      mentor.role = "MENTOR";
      mentor.branch = "AIML";
      mentor.section = "AIML-A";
      mentor.password = hashedMentorPass;
      await mentor.save();
    } else {
      mentor = await User.create({
        name: "Kumar Mentor",
        email: "kumar@mentor.com",
        password: hashedMentorPass,
        role: "MENTOR",
        branch: "AIML",
        section: "AIML-A",
      });
    }

    // Parent: Ramesh (Linked to Rahul)
    let parent = await Parent.findOne({ email: "parent@test.com" });
    if (parent) {
      parent.name = "Ramesh (Rahul's Parent)";
      parent.role = "PARENT";
      parent.password = hashedParentPass;
      parent.student = student._id;
      await parent.save();
    } else {
      parent = await Parent.create({
        name: "Ramesh (Rahul's Parent)",
        email: "parent@test.com",
        password: hashedParentPass,
        role: "PARENT",
        student: student._id,
      });
    }

    // Also sync in User collection
    let parentUser = await User.findOne({ email: "parent@test.com" });
    if (parentUser) {
      parentUser.name = "Ramesh (Rahul's Parent)";
      parentUser.role = "PARENT";
      parentUser.password = hashedParentPass;
      await parentUser.save();
    } else {
      await User.create({
        name: "Ramesh (Rahul's Parent)",
        email: "parent@test.com",
        password: hashedParentPass,
        role: "PARENT",
      });
    }

    // Admin
    let admin = await User.findOne({ email: "admin@edubridge.com" });
    if (admin) {
      admin.name = "Admin";
      admin.role = "ADMIN";
      admin.password = hashedAdminPass;
      await admin.save();
    } else {
      admin = await User.create({
        name: "Admin",
        email: "admin@edubridge.com",
        password: hashedAdminPass,
        role: "ADMIN",
      });
    }

    console.log("Users created/updated");
    console.log(`Rahul Student ID: ${student._id}`);
    console.log(`Kumar Mentor ID: ${mentor._id}`);
    console.log("Parent linked to Rahul");

    // ==========================================
    // 3. ATTENDANCE (3 records: 2 PRESENT, 1 ABSENT -> 66.7%)
    // ==========================================
    await Attendance.deleteMany({ student: student._id });

    await Attendance.create([
      {
        student: student._id,
        mentor: mentor._id,
        date: new Date("2026-08-20T00:00:00.000Z"),
        status: "PRESENT",
        reason: "",
      },
      {
        student: student._id,
        mentor: mentor._id,
        date: new Date("2026-08-21T00:00:00.000Z"),
        status: "PRESENT",
        reason: "",
      },
      {
        student: student._id,
        mentor: mentor._id,
        date: new Date("2026-08-24T00:00:00.000Z"),
        status: "ABSENT",
        reason: "Personal work",
      },
    ]);
    console.log("Attendance seeded");

    // ==========================================
    // 4. MARKS (1 record: 85 / 100 -> 85.0%)
    // ==========================================
    await Mark.deleteMany({ student: student._id });

    await Mark.create({
      student: student._id,
      mentor: mentor._id,
      subject: "Machine Learning",
      exam: "Mid Term 1",
      marksObtained: 85,
      maxMarks: 100,
    });
    console.log("Marks seeded");

    // ==========================================
    // 5. FEES (Total: 55,000, Paid: 33,000, Due: 22,000)
    // ==========================================
    await Fee.deleteMany({ student: student._id });

    await Fee.create({
      student: student._id,
      totalAmount: 55000,
      paidAmount: 33000,
      dueDate: new Date("2026-10-31T00:00:00.000Z"),
      status: "PARTIAL",
    });
    console.log("Fees seeded");

    // ==========================================
    // 6. OBSERVATION (1 record)
    // ==========================================
    await Observation.deleteMany({ student: student._id });

    await Observation.create({
      student: student._id,
      mentor: mentor._id,
      title: "Classroom Observation",
      description: "Student is participating well in classroom activities.",
      category: "GENERAL",
      priority: "MEDIUM",
      date: new Date("2026-08-25T00:00:00.000Z"),
    });
    console.log("Observation seeded");

    // ==========================================
    // 7. PRESERVE / ENSURE HOLIDAYS, LEAVES, ISSUES
    // ==========================================
    const holidayCount = await Holiday.countDocuments();
    if (holidayCount === 0) {
      await Holiday.create({
        title: "Weekend Holiday",
        date: new Date("2026-08-22T00:00:00.000Z"),
        type: "COLLEGE",
        description: "College holiday",
        branch: "AIML",
        section: "AIML-A",
        createdBy: mentor._id,
      });
    }

    const leaveCount = await LeaveLetter.countDocuments({ student: student._id });
    if (leaveCount === 0) {
      await LeaveLetter.create({
        student: student._id,
        mentor: mentor._id,
        fromDate: new Date("2026-09-02T00:00:00.000Z"),
        toDate: new Date("2026-09-05T00:00:00.000Z"),
        reason: "sister's marriage sir",
        status: "APPROVED",
      });
    }

    const issueCount = await Issue.countDocuments({ student: student._id });
    if (issueCount === 0) {
      await Issue.create({
        student: student._id,
        mentor: mentor._id,
        issueType: "INFRASTRUCTURE",
        description: "my bench has broken sir",
        status: "RESOLVED",
      });
    }

    console.log("Database seed completed successfully");
  } catch (error) {
    console.error("Database seed failed ❌", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
