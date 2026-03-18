require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function seedAdmin() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bus_management";

  try {
    await mongoose.connect(mongoUri);

    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "123456";
    const fullName = process.env.ADMIN_FULLNAME || "Administrator";
    const position = process.env.ADMIN_POSITION || "Quan tri he thong";

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      console.log(`Tai khoan ${username} da ton tai.`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      username,
      password: hashedPassword,
      role: "admin",
      fullName,
      position
    });

    console.log(`Da tao tai khoan admin: ${username}`);
    process.exit(0);
  } catch (error) {
    console.error("Khong tao duoc tai khoan admin:", error.message);
    process.exit(1);
  }
}

seedAdmin();
