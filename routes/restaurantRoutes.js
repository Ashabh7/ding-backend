const express = require("express");
const Restaurant = require("../models/Restaurant");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Get all restaurants
router.get("/restaurants", async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get one restaurant
router.get("/restaurants/:id", async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    res.json(restaurant);
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({
        message: "Invalid restaurant ID",
      });
    }

    res.status(500).json({ message: err.message });
  }
});

// Get the restaurant owned by the logged-in restaurant user
router.get(
  "/my-restaurant",
  authMiddleware,
  roleMiddleware(["restaurant"]),
  async (req, res) => {
    try {
      const restaurant = await Restaurant.findOne({
        owner: req.user.id,
      });

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      res.json(restaurant);
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  },
);

// Admin can create a restaurant directly
router.post(
  "/restaurants",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res) => {
    try {
      const { name, image, owner, location } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({
          message: "Restaurant name is required",
        });
      }

      if (!owner) {
        return res.status(400).json({
          message: "Restaurant owner is required",
        });
      }

      if (
        !location?.street?.trim() ||
        !location?.city?.trim() ||
        !location?.pincode?.trim()
      ) {
        return res.status(400).json({
          message: "Complete restaurant location is required",
        });
      }

      const newRestaurant = new Restaurant({
        name,
        image: image || "",
        owner,
        location: {
          street: location.street,
          city: location.city,
          pincode: location.pincode,
        },
      });

      await newRestaurant.save();

      res.json(newRestaurant);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// Update restaurant
router.put(
  "/restaurants/:id",
  authMiddleware,
  roleMiddleware(["restaurant", "admin"]),
  async (req, res) => {
    try {
      const restaurant = await Restaurant.findById(req.params.id);

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      if (
        req.user.role !== "admin" &&
        restaurant.owner.toString() !== req.user.id
      ) {
        return res.status(403).json({
          message: "You can only edit your own restaurant",
        });
      }

      const { name, image, location } = req.body;
      const updates = {};

      if (name !== undefined) {
        if (!name.trim()) {
          return res.status(400).json({
            message: "Restaurant name cannot be empty",
          });
        }

        updates.name = name.trim();
      }

      if (image !== undefined) {
        updates.image = image.trim();
      }

      if (location !== undefined) {
        if (
          !location.street?.trim() ||
          !location.city?.trim() ||
          !location.pincode?.trim()
        ) {
          return res.status(400).json({
            message: "Complete restaurant location is required",
          });
        }

        updates.location = {
          street: location.street.trim(),
          city: location.city.trim(),
          pincode: location.pincode.trim(),
        };
      }

      const updatedRestaurant = await Restaurant.findByIdAndUpdate(
        req.params.id,
        updates,
        {
          new: true,
          runValidators: true,
        },
      );

      res.json(updatedRestaurant);
    } catch (err) {
      if (err.name === "CastError") {
        return res.status(400).json({
          message: "Invalid restaurant ID",
        });
      }

      res.status(500).json({ message: err.message });
    }
  },
);

// Delete restaurant
router.delete(
  "/restaurants/:id",
  authMiddleware,
  roleMiddleware(["restaurant", "admin"]),
  async (req, res) => {
    try {
      const restaurant = await Restaurant.findById(req.params.id);

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      if (
        req.user.role !== "admin" &&
        restaurant.owner.toString() !== req.user.id
      ) {
        return res.status(403).json({
          message: "You can only delete your own restaurant",
        });
      }

      await Restaurant.findByIdAndDelete(req.params.id);

      res.json({
        message: "Restaurant Deleted",
      });
    } catch (err) {
      if (err.name === "CastError") {
        return res.status(400).json({
          message: "Invalid restaurant ID",
        });
      }

      res.status(500).json({
        message: err.message,
      });
    }
  },
);

module.exports = router;