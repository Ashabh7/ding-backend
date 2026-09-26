const express = require("express");
const Food = require("../models/Food");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const Restaurant = require("../models/Restaurant");

const router = express.Router();

//Get the food
router.get("/foods", authMiddleware, async (req, res) => {
  try {
    const foods = await Food.find();
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get Food by ID
router.get("/foods/:id", async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    res.json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Post new Food
router.post(
  "/foods",
  authMiddleware,
  roleMiddleware(["restaurant", "admin"]),
  async (req, res) => {
    try {
      const restaurant = await Restaurant.findById(req.body.restaurant);

      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      if (
        req.user.role !== "admin" &&
        restaurant.owner.toString() !== req.user.id
      ) {
        return res
          .status(403)
          .json({ message: "You can only add food to your own restaurant" });
      }
      const newFood = new Food(req.body);
      await newFood.save();
      res.json(newFood);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

//Delete the Food
router.delete(
  "/foods/:id",
  authMiddleware,
  roleMiddleware(["restaurant", "admin"]),
  async (req, res) => {
    try {
      const food = await Food.findById(req.params.id);

      if (!food) {
        return res.status(404).json({ message: "Food not found" });
      }

      const restaurant = await Restaurant.findById(food.restaurant);

      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      if (
        req.user.role !== "admin" &&
        restaurant.owner.toString() !== req.user.id
      ) {
        return res
          .status(403)
          .json({
            message: "You can only delete food from your own restaurant",
          });
      }

      await Food.findByIdAndDelete(req.params.id);

      res.json({ message: "Food Deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

//Update the food
router.put(
  "/foods/:id",
  authMiddleware,
  roleMiddleware(["restaurant", "admin"]),
  async (req, res) => {
    try {
      const food = await Food.findById(req.params.id);

      if (!food) {
        return res.status(404).json({ message: "Food not found" });
      }

      const restaurant = await Restaurant.findById(food.restaurant);

      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      if (
        req.user.role !== "admin" &&
        restaurant.owner.toString() !== req.user.id
      ) {
        return res
          .status(403)
          .json({ message: "You can only edit food from your own restaurant" });
      }

      const updatedFood = await Food.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true, //So that the MongoDB returns the uppdated value, otherwise returns the old value.
        },
      );
      res.json(updatedFood);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

module.exports = router;
