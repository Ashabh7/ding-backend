const express = require("express");
const Restaurant = require("../models/Restaurant");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

//Get the restaurant
router.get("/restaurants", async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get the Restaurant by ID
router.get("/restaurants/:id", async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Post the Restaurant
router.post(
  "/restaurants",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res) => {
    try {
      const newRestaurant = new Restaurant(req.body);
      await newRestaurant.save();
      res.json(newRestaurant);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

//Update the Restaurant
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
        return res
          .status(403)
          .json({ message: "You can only edit your own restaurant" });
      }
      const updatedRestaurant = await Restaurant.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true },
      );

      res.json(updatedRestaurant);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

//Delete the Restaurant
// Delete the Restaurant
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

      // Admin can delete any restaurant
      // Restaurant can delete only their own restaurant
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
      res.status(500).json({
        message: err.message,
      });
    }
  },
);

module.exports = router;
