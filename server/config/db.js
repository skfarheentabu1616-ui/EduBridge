const mongoose = require("mongoose");

const DEFAULT_MONGO_URI =
  "mongodb+srv://skfarheentabu1616_db_user:sadiqraza1616@cluster0.hccnmgh.mongodb.net/EduBridge?retryWrites=true&w=majority";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
    await mongoose.connect(uri);
    console.log("MongoDB connected successfully ✅");
  } catch (error) {
    console.error("MongoDB connection failed ❌", error.message);
  }
};

module.exports = connectDB;