const express = require("express");
const User = require("../models/User");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Get all Users - Admin only
router.get(
  "/users",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res) => {
    try {
      const users = await User.find().select("-password");
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// Get User by ID - Own profile or Admin
router.get(
  "/users/:id",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.id !== req.params.id) {
        return res.status(403).json({
          message: "You can only view your own profile",
        });
      }

      const user = await User.findById(req.params.id).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// Register User - Public
router.post("/users", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const newUser = new User({
      ...req.body,
      password: hashedPassword,
    });

    await newUser.save();

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login - Public
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login Successful",
      token: token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update User - Own profile or Admin
router.put(
  "/users/:id",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.id !== req.params.id) {
        return res.status(403).json({
          message: "You can only edit your own profile",
        });
      }

      const updates = { ...req.body };

      // Prevent non-admin users from changing their role
      if (req.user.role !== "admin") {
        delete updates.role;
      }

      // Hash password if password is being changed
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updates,
        {
          new: true,
        },
      ).select("-password");

      if (!updatedUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// Delete User - Own account or Admin
router.delete(
  "/users/:id",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.id !== req.params.id) {
        return res.status(403).json({
          message: "You can only delete your own account",
        });
      }

      const deletedUser = await User.findByIdAndDelete(req.params.id);

      if (!deletedUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json({
        message: "User Deleted",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

module.exports = router;
