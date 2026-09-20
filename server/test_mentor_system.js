
require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const issueRoutes = require("./routes/issueRoutes");
const feeRoutes = require("./routes/feeRoutes");
const marksRoutes = require("./routes/marks");
const parentRoutes = require("./routes/parentRoutes");
const pdfUploadRoutes = require("./routes/pdfUploadRoutes");
const adminRoutes = require("./routes/adminRoutes");
const mentorRoutes = require("./routes/mentorRoutes");
const holidayRoutes = require("./routes/holidayRoutes");
const observationRoutes = require("./routes/observationRoutes");
const timetableRoutes = require("./routes/timetableRoutes");

const User = require("./models/User");
const Parent = require("./models/Parent");

require("dotenv").config();

async function runTests() {
  console.log("==================================================");
  console.log("STARTING EDUBRIDGE MENTOR MANAGEMENT TEST MATRIX");
  console.log("==================================================");

  console.log("Connecting to MongoDB...");
  await connectDB();
  console.log("MongoDB connection established.");

  // Create test express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/leave", leaveRoutes);
  app.use("/api/issues", issueRoutes);
  app.use("/api/fees", feeRoutes);
  app.use("/api/marks", marksRoutes);
  app.use("/api/parent", parentRoutes);
  app.use("/api/pdf", pdfUploadRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/mentor", mentorRoutes);
  app.use("/api/holidays", holidayRoutes);
  app.use("/api/observations", observationRoutes);
  app.use("/api/timetable", timetableRoutes);

  let server;
  await new Promise((resolve) => {
    server = app.listen(5099, "127.0.0.1", () => {
      console.log("Test server listening on 127.0.0.1:5099");
      resolve();
    });
  });

  const BASE = "http://127.0.0.1:5099/api";

  const request = async (url, options = {}) => {
    const res = await fetch(`${BASE}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  };

  let passed = 0;
  let failed = 0;

  const assert = (condition, desc) => {
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      failed++;
    }
  };

  try {
    // 1. Test Admin Login
    console.log("\n--- TEST 1: Admin Login ---");
    const adminRes = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@edubridge.com",
        password: "admin", // or admin123
      }),
    });
    let adminToken = "";
    if (adminRes.ok) {
      adminToken = adminRes.data.token;
      assert(adminRes.ok, "Admin login successful");
    } else {
      // try admin123
      const adminRes2 = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@edubridge.com",
          password: "admin123",
        }),
      });
      adminToken = adminRes2.data.token;
      assert(adminRes2.ok, "Admin login with admin123 successful");
    }

    // 2. Test Existing Mentor Login (Kumar Mentor)
    console.log("\n--- TEST 2: Existing Kumar Mentor Login ---");
    const kumarRes = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "kumar@mentor.com",
        password: "password123",
      }),
    });
    assert(kumarRes.ok && kumarRes.data.user.role === "MENTOR", "Kumar Mentor login successful");
    const kumarId = kumarRes.data?.user?._id || kumarRes.data?.user?.id;

    // 3. Test Existing Student Login (Rahul)
    console.log("\n--- TEST 3: Existing Rahul Student Login ---");
    const rahulRes = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "rahul@student.com",
        password: "password123",
      }),
    });
    assert(rahulRes.ok && rahulRes.data.user.role === "STUDENT", "Rahul Student login successful");
    const rahulId = rahulRes.data?.user?._id || rahulRes.data?.user?.id;

    // 4. Test Existing Parent Login (Ramesh Parent)
    console.log("\n--- TEST 4: Existing Parent Login ---");
    const parentRes = await request("/parent/login", {
      method: "POST",
      body: JSON.stringify({
        email: "parent@test.com",
        password: "password123",
      }),
    });
    assert(parentRes.ok && parentRes.data.user.role === "PARENT", "Ramesh Parent login successful");

    // 5. Test Block Public Mentor Registration
    console.log("\n--- TEST 5: Block Public Mentor Registration ---");
    const badReg = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Hacker Mentor",
        email: "hacker@mentor.com",
        password: "password123",
        role: "MENTOR",
        branch: "AIML",
        section: "AIML-A",
      }),
    });
    assert(badReg.status === 403, "Public mentor registration is blocked with 403 Forbidden");

    // 6. Test Admin Creates Mentor Account
    console.log("\n--- TEST 6: Admin Creates Mentor Account ---");
    const testMentorEmail = `mentor_test_${Date.now()}@edubridge.com`;
    const createMentorRes = await request("/admin/mentors", {
      method: "POST",
      body: JSON.stringify({
        name: "Dr. Anita Rao",
        email: testMentorEmail,
        password: "password123",
        branch: "AIML",
        section: "AIML-A",
      }),
    });
    assert(createMentorRes.status === 201 && createMentorRes.data.mentor.email === testMentorEmail, "Admin created new mentor successfully");
    const newMentorId = createMentorRes.data.mentor._id;

    // 7. Test New Mentor Login
    console.log("\n--- TEST 7: New Mentor Login ---");
    const newMentorLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: testMentorEmail,
        password: "password123",
      }),
    });
    assert(newMentorLogin.ok && newMentorLogin.data.user.role === "MENTOR", "New mentor logged in successfully with bcrypt-hashed password");

    // 8. Test Student Self-Registration
    console.log("\n--- TEST 8: Student Self-Registration ---");
    const testStudentEmail = `student_test_${Date.now()}@edubridge.com`;
    const regStudentRes = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Zoya Khan",
        email: testStudentEmail,
        password: "password123",
        role: "STUDENT",
        branch: "AIML",
        section: "AIML-A",
      }),
    });
    assert(regStudentRes.status === 201, "New student self-registered successfully");
    const newStudentId = regStudentRes.data.user._id;

    // 9. Test Parent Registration Linked to New Student
    console.log("\n--- TEST 9: Parent Registration Linked to New Student ---");
    const testParentEmail = `parent_test_${Date.now()}@edubridge.com`;
    const regParentRes = await request("/parent/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Mr. Khan",
        email: testParentEmail,
        password: "password123",
        studentEmail: testStudentEmail,
      }),
    });
    assert(regParentRes.status === 201, "New parent registered and linked to student");

    // 10. Test Admin GET /api/admin/students (Shows newly registered student as Unassigned)
    console.log("\n--- TEST 10: Admin Visibility of Students ---");
    const adminStudentsRes = await request("/admin/students");
    assert(adminStudentsRes.ok && Array.isArray(adminStudentsRes.data), "Admin fetched all students");
    const foundZoya = adminStudentsRes.data.find((s) => s.email === testStudentEmail);
    assert(foundZoya && foundZoya.assignmentStatus === "Unassigned", "Newly registered student is visible and marked Unassigned");

    // 11. Test Assign Student to New Mentor
    console.log("\n--- TEST 11: Student-Mentor Assignment ---");
    const assignRes = await request(`/admin/students/${newStudentId}/assign-mentor`, {
      method: "PUT",
      body: JSON.stringify({
        mentorId: newMentorId,
      }),
    });
    assert(assignRes.ok && assignRes.data.student.isAssigned === true, "Admin assigned student to new mentor");

    // 12. Test Assign Rahul to Kumar Mentor (Multiple Students / Flexible count)
    console.log("\n--- TEST 12: Assign Rahul to Kumar Mentor ---");
    const assignRahul = await request(`/admin/students/${rahulId}/assign-mentor`, {
      method: "PUT",
      body: JSON.stringify({
        mentorId: kumarId,
      }),
    });
    assert(assignRahul.ok, "Rahul assigned to Kumar Mentor");

    // 13. Test Mentor Isolation: New Mentor sees only Zoya, Kumar sees only Rahul
    console.log("\n--- TEST 13: Mentor Student Isolation ---");
    const newMentorStudents = await request(`/mentor/${newMentorId}/students`);
    assert(
      newMentorStudents.ok &&
      newMentorStudents.data.length === 1 &&
      newMentorStudents.data[0]._id === newStudentId,
      "New mentor sees only Zoya Khan"
    );

    const kumarStudents = await request(`/mentor/${kumarId}/students`);
    const kumarHasRahul = kumarStudents.data.some((s) => s._id === rahulId);
    const kumarHasZoya = kumarStudents.data.some((s) => s._id === newStudentId);
    assert(kumarHasRahul && !kumarHasZoya, "Kumar mentor sees Rahul and does NOT see Zoya");

    // 14. Test Mentor Creates Observation for Assigned Student
    console.log("\n--- TEST 14: Mentor Creates Observation ---");
    const obsRes = await request("/observations", {
      method: "POST",
      body: JSON.stringify({
        student: newStudentId,
        mentor: newMentorId,
        category: "PERFORMANCE",
        title: "Mid-Term Project Evaluation",
        description: "Excellent presentation in Computer Vision expo.",
        priority: "HIGH",
      }),
    });
    assert(obsRes.status === 201, "Mentor created performance observation for assigned student");

    // 15. Test Security: New Mentor CANNOT create observation for Kumar's student (Rahul)
    console.log("\n--- TEST 15: Security - Mentor Isolation Protection ---");
    const unauthorizedObs = await request("/observations", {
      method: "POST",
      body: JSON.stringify({
        student: rahulId,
        mentor: newMentorId,
        category: "GENERAL",
        description: "Unauthorized observation test",
      }),
    });
    assert(unauthorizedObs.status === 403, "Mentor rejected with 403 when trying to modify another mentor's student");

    // 16. Test Parent Sees Mentor Updates
    console.log("\n--- TEST 16: Parent Views Mentor Updates ---");
    const parentObsRes = await request(`/observations/student/${newStudentId}`);
    assert(
      parentObsRes.ok &&
      parentObsRes.data.observations.length >= 1 &&
      parentObsRes.data.observations[0].description.includes("Computer Vision expo"),
      "Parent successfully retrieved mentor performance observation for ward"
    );

    // 17. Test Student Reassignment
    console.log("\n--- TEST 17: Reassign Student between Mentors ---");
    const reassignRes = await request(`/admin/students/${newStudentId}/assign-mentor`, {
      method: "PUT",
      body: JSON.stringify({
        mentorId: kumarId,
      }),
    });
    assert(reassignRes.ok && reassignRes.data.student.mentor._id === kumarId, "Student successfully reassigned to Kumar Mentor");

    // 18. Test Unassign Student
    console.log("\n--- TEST 18: Unassign Student ---");
    const unassignRes = await request(`/admin/students/${newStudentId}/assign-mentor`, {
      method: "PUT",
      body: JSON.stringify({
        mentorId: "unassign",
      }),
    });
    assert(unassignRes.ok && unassignRes.data.student.isAssigned === false, "Student successfully unassigned from mentor");

    // Clean up test data (leave existing demo accounts intact!)
    await User.deleteOne({ _id: newMentorId });
    await User.deleteOne({ _id: newStudentId });
    await Parent.deleteOne({ email: testParentEmail });

    // Restore Rahul assignment to Kumar mentor for standard demo state
    await User.updateOne({ _id: rahulId }, { $set: { mentor: kumarId } });

    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests();
