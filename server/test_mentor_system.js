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

  const createdUserIds = [];
  const createdParentEmails = [];

  try {
    // 1. Test Admin Login
    console.log("\n--- TEST 1: Admin Login ---");
    let adminRes = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@edubridge.com",
        password: "admin",
      }),
    });
    if (!adminRes.ok) {
      adminRes = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@edubridge.com",
          password: "admin123",
        }),
      });
    }
    assert(adminRes.ok && adminRes.data.user.role === "ADMIN", "Admin login successful with credentials");

    // 2. Test Existing Kumar Mentor Login
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
    const kumarToken = kumarRes.data?.token;

    // 3. Test Existing Rahul Student Login
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

    // 4. Test Existing Ramesh Parent Login
    console.log("\n--- TEST 4: Existing Parent Login ---");
    const parentRes = await request("/parent/login", {
      method: "POST",
      body: JSON.stringify({
        email: "parent@test.com",
        password: "password123",
      }),
    });
    assert(parentRes.ok && parentRes.data.user.role === "PARENT", "Ramesh Parent login successful");

    // 5. Test Public Mentor Self-Registration (NOW ALLOWED)
    console.log("\n--- TEST 5: Public Mentor Self-Registration ---");
    const testMentorEmail = `mentor_self_${Date.now()}@edubridge.com`;
    const regMentorRes = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Prof. Suresh Sharma",
        email: testMentorEmail,
        password: "password123",
        role: "MENTOR",
        branch: "CSE",
        section: "CSE-A",
      }),
    });
    assert(regMentorRes.status === 201 && regMentorRes.data.user.role === "MENTOR", "Public Mentor self-registration succeeds with 201 Created and JWT token");
    const newMentorId = regMentorRes.data.user._id;
    const newMentorToken = regMentorRes.data.token;
    createdUserIds.push(newMentorId);

    // 6. Test Public Admin Registration is Blocked (403 Forbidden)
    console.log("\n--- TEST 6: Public Admin Registration Blocked ---");
    const badAdminReg = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Fake Admin",
        email: "fakeadmin@edubridge.com",
        password: "password123",
        role: "ADMIN",
      }),
    });
    assert(badAdminReg.status === 403, "Public Admin registration is blocked with 403 Forbidden");

    // 7. Test New Mentor Login with Credentials
    console.log("\n--- TEST 7: New Mentor Login ---");
    const newMentorLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: testMentorEmail,
        password: "password123",
      }),
    });
    assert(newMentorLogin.ok && newMentorLogin.data.user.role === "MENTOR", "Self-registered mentor can log in successfully with bcrypt verification");

    // 8. Test Student Self-Registration
    console.log("\n--- TEST 8: Student Self-Registration ---");
    const testStudentEmail = `student_self_${Date.now()}@edubridge.com`;
    const regStudentRes = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Aarav Patel",
        email: testStudentEmail,
        password: "password123",
        role: "STUDENT",
        branch: "CSE",
        section: "CSE-A",
      }),
    });
    assert(regStudentRes.status === 201, "New student self-registered successfully");
    const newStudentId = regStudentRes.data.user._id;
    createdUserIds.push(newStudentId);

    // 9. Test Parent Registration Linked to New Student
    console.log("\n--- TEST 9: Parent Registration Linked to New Student ---");
    const testParentEmail = `parent_self_${Date.now()}@edubridge.com`;
    const regParentRes = await request("/parent/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Mr. Patel",
        email: testParentEmail,
        password: "password123",
        studentEmail: testStudentEmail,
      }),
    });
    assert(regParentRes.status === 201, "New parent registered and linked to student");
    createdParentEmails.push(testParentEmail);

    // 10. Test Admin Views All Students (Dynamic MongoDB fetch)
    console.log("\n--- TEST 10: Admin Visibility of All Students ---");
    const adminStudentsRes = await request("/admin/students");
    assert(adminStudentsRes.ok && Array.isArray(adminStudentsRes.data), "Admin fetched all students");
    const foundAarav = adminStudentsRes.data.find((s) => s.email === testStudentEmail);
    assert(foundAarav && foundAarav.assignmentStatus === "Unassigned", "Newly registered student is visible to Admin and marked Unassigned");

    // 11. Test Assign Student to New Mentor (No Count Restrictions)
    console.log("\n--- TEST 11: Admin Assigns Student to Mentor ---");
    const assignRes = await request(`/admin/students/${newStudentId}/assign-mentor`, {
      method: "PUT",
      body: JSON.stringify({
        mentorId: newMentorId,
      }),
    });
    assert(assignRes.ok && assignRes.data.student.isAssigned === true, "Admin assigned student to new mentor successfully");

    // 12. Test Assigning Multiple Additional Students to New Mentor (Demonstrating NO 3/10 student limit)
    console.log("\n--- TEST 12: Assign Multiple Students to Same Mentor (No Limit) ---");
    const additionalStudentIds = [];
    for (let i = 1; i <= 4; i++) {
      const email = `bulk_student_${i}_${Date.now()}@edubridge.com`;
      const sRes = await request("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: `Bulk Student ${i}`,
          email,
          password: "password123",
          role: "STUDENT",
          branch: "CSE",
          section: "CSE-A",
        }),
      });
      if (sRes.ok && sRes.data.user?._id) {
        const sid = sRes.data.user._id;
        additionalStudentIds.push(sid);
        createdUserIds.push(sid);
        await request(`/admin/students/${sid}/assign-mentor`, {
          method: "PUT",
          body: JSON.stringify({ mentorId: newMentorId }),
        });
      }
    }
    assert(additionalStudentIds.length === 4, "Created and assigned 4 more students without any capacity blocking");

    // 13. Test Mentor Student Retrieval via JWT (/api/mentor/students) and by Param (/api/mentor/:id/students)
    console.log("\n--- TEST 13: Mentor Dashboard Isolation & Full Student List ---");
    const mentorSelfStudents = await request("/mentor/students", {
      headers: { Authorization: `Bearer ${newMentorToken}` },
    });
    assert(
      mentorSelfStudents.ok && mentorSelfStudents.data.length === 5,
      `New mentor sees all 5 assigned students via GET /api/mentor/students (JWT auth): returned ${mentorSelfStudents.data?.length} students`
    );

    const kumarStudents = await request(`/mentor/${kumarId}/students`);
    const kumarHasAarav = kumarStudents.data.some((s) => s._id === newStudentId);
    assert(kumarStudents.ok && !kumarHasAarav, "Kumar mentor does NOT see Aarav (Mentor Isolation Verified)");

    // 14. Test Mentor Creates Performance Observation for Assigned Student
    console.log("\n--- TEST 14: Mentor Creates Performance Observation ---");
    const obsRes = await request("/observations", {
      method: "POST",
      body: JSON.stringify({
        student: newStudentId,
        mentor: newMentorId,
        category: "PERFORMANCE",
        title: "Mid-Term Academic Review",
        description: "Outstanding progress in Data Structures and Algorithms.",
        priority: "HIGH",
      }),
    });
    assert(obsRes.status === 201, "Mentor created performance observation for assigned student");

    // 15. Test Security: Kumar Mentor CANNOT create observation for Aarav (assigned to Suresh)
    console.log("\n--- TEST 15: Security - Mentor Isolation Protection ---");
    const unauthorizedObs = await request("/observations", {
      method: "POST",
      body: JSON.stringify({
        student: newStudentId,
        mentor: kumarId,
        category: "GENERAL",
        description: "Unauthorized observation test",
      }),
    });
    assert(unauthorizedObs.status === 403, "Mentor rejected with 403 Forbidden when attempting to record update for unassigned student");

    // 16. Test Parent Sees Mentor Performance Updates
    console.log("\n--- TEST 16: Parent Views Mentor Updates for Child ---");
    const parentObsRes = await request(`/observations/student/${newStudentId}`);
    assert(
      parentObsRes.ok &&
      parentObsRes.data.observations.length >= 1 &&
      parentObsRes.data.observations[0].description.includes("Data Structures and Algorithms"),
      "Parent successfully retrieved mentor performance observation for their child"
    );

    // 17. Test Admin Student Reassignment
    console.log("\n--- TEST 17: Admin Reassigns Student Between Mentors ---");
    const reassignRes = await request(`/admin/students/${newStudentId}/assign-mentor`, {
      method: "PUT",
      body: JSON.stringify({
        mentorId: kumarId,
      }),
    });
    assert(reassignRes.ok && reassignRes.data.student.mentor._id === kumarId, "Admin successfully reassigned student from Suresh to Kumar");

    // 18. Test Admin Unassign Student
    console.log("\n--- TEST 18: Admin Unassigns Student ---");
    const unassignRes = await request(`/admin/students/${newStudentId}/assign-mentor`, {
      method: "PUT",
      body: JSON.stringify({
        mentorId: "unassign",
      }),
    });
    assert(unassignRes.ok && unassignRes.data.student.isAssigned === false, "Admin successfully unassigned student from mentor");

    // Clean up created test data (leave existing demo accounts intact)
    for (const uid of createdUserIds) {
      await User.deleteOne({ _id: uid });
    }
    for (const pem of createdParentEmails) {
      await Parent.deleteOne({ email: pem });
    }

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
