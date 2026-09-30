require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const hashedPassword = await bcrypt.hash("123456", 10);

  const admin = new User({
    name: "Ding Admin 3",
    email: "admin3@ding.com",
    password: hashedPassword,
    role: "admin",
  });

  await admin.save();

  console.log("Admin created successfully");

  await mongoose.disconnect();
}

createAdmin();