const express = require("express");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

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

router.get("/users/:id", authMiddleware, async (req, res) => {
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
});

router.post("/users", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "customer",
    });

    await newUser.save();

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.email) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    res.status(500).json({ message: err.message });
  }
});

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

router.put("/users/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({
        message: "You can only edit your own profile",
      });
    }

    const updates = { ...req.body };

    if (req.user.role !== "admin") {
      delete updates.role;
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(updatedUser);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.email) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    res.status(500).json({ message: err.message });
  }
});

router.delete("/users/:id", authMiddleware, async (req, res) => {
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
    res.status(500).json({
      message: err.message,
    });
  }
});

router.post(
  "/restaurant-users",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res) => {
    try {
      const { name, email, password, restaurantName, street, city, pincode } =
        req.body;

      if (!name?.trim()) {
        return res.status(400).json({
          message: "Owner name is required",
        });
      }

      if (!email?.trim()) {
        return res.status(400).json({
          message: "Email is required",
        });
      }

      if (!password) {
        return res.status(400).json({
          message: "Password is required",
        });
      }

      if (!restaurantName?.trim()) {
        return res.status(400).json({
          message: "Restaurant name is required",
        });
      }

      if (!street?.trim()) {
        return res.status(400).json({
          message: "Street is required",
        });
      }

      if (!city?.trim()) {
        return res.status(400).json({
          message: "City is required",
        });
      }

      if (!pincode?.trim()) {
        return res.status(400).json({
          message: "Pincode is required",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role: "restaurant",
      });

      await newUser.save();

      const newRestaurant = new Restaurant({
        name: restaurantName,
        owner: newUser._id,
        location: {
          street,
          city,
          pincode,
        },
      });

      await newRestaurant.save();

      const userResponse = newUser.toObject();
      delete userResponse.password;

      res.json({
        user: userResponse,
        restaurant: newRestaurant,
      });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.email) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }

      res.status(500).json({
        message: err.message,
      });
    }
  },
);

module.exports = router;
