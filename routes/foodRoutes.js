const express = require("express");
const Food = require("../models/Food");
const Restaurant = require("../models/Restaurant");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Get all food
router.get("/foods", async (req, res) => {
  try {
    const foods = await Food.find();
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get food by ID
router.get("/foods/:id", async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        message: "Food not found",
      });
    }

    res.json(food);
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({
        message: "Invalid food ID",
      });
    }

    res.status(500).json({ message: err.message });
  }
});

// Add new food
router.post(
  "/foods",
  authMiddleware,
  roleMiddleware(["restaurant", "admin"]),
  async (req, res) => {
    try {
      const { name, price, restaurant } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({
          message: "Food name is required",
        });
      }

      if (price === undefined || price === null || price === "") {
        return res.status(400).json({
          message: "Price is required",
        });
      }

      if (typeof price !== "number" || price <= 0) {
        return res.status(400).json({
          message: "Price must be greater than 0",
        });
      }

      if (!restaurant) {
        return res.status(400).json({
          message: "Restaurant is required",
        });
      }

      const restaurantData = await Restaurant.findById(restaurant);

      if (!restaurantData) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      if (
        req.user.role !== "admin" &&
        restaurantData.owner.toString() !== req.user.id
      ) {
        return res.status(403).json({
          message: "You can only add food to your own restaurant",
        });
      }

      const newFood = new Food({
        name,
        price,
        restaurant,
      });

      await newFood.save();

      res.json(newFood);
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  },
);

// Delete food
router.delete(
  "/foods/:id",
  authMiddleware,
  roleMiddleware(["restaurant", "admin"]),
  async (req, res) => {
    try {
      const food = await Food.findById(req.params.id);

      if (!food) {
        return res.status(404).json({
          message: "Food not found",
        });
      }

      const restaurant = await Restaurant.findById(food.restaurant);

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
          message: "You can only delete food from your own restaurant",
        });
      }

      await Food.findByIdAndDelete(req.params.id);

      res.json({
        message: "Food Deleted",
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  },
);

// Update food
router.put(
  "/foods/:id",
  authMiddleware,
  roleMiddleware(["restaurant", "admin"]),
  async (req, res) => {
    try {
      const food = await Food.findById(req.params.id);

      if (!food) {
        return res.status(404).json({
          message: "Food not found",
        });
      }

      const restaurant = await Restaurant.findById(food.restaurant);

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
          message: "You can only edit food from your own restaurant",
        });
      }

      const { name, price } = req.body;

      if (name !== undefined && !name.trim()) {
        return res.status(400).json({
          message: "Food name cannot be empty",
        });
      }

      if (price !== undefined) {
        if (typeof price !== "number" || price <= 0) {
          return res.status(400).json({
            message: "Price must be greater than 0",
          });
        }
      }

      const updates = {};

      if (name !== undefined) {
        updates.name = name;
      }

      if (price !== undefined) {
        updates.price = price;
      }

      const updatedFood = await Food.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      });

      res.json(updatedFood);
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  },
);

module.exports = router;
