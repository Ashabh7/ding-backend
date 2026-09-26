const express = require("express");
const Food = require("../models/Food");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

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
      const newFood = new Food(req.body);
      await newFood.save();
      res.json(newFood);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

//Delete the Food
router.delete("/foods/:id", async (req, res) => {
  try {
    await Food.findByIdAndDelete(req.params.id);
    res.json({ message: "Food Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Update the food
router.put("/foods/:id", async (req, res) => {
  try {
    const updatedFood = await Food.findByIdAndUpdate(req.params.id, req.body, {
      new: true, //So that the MongoDB returns the uppdated value, otherwise returns the old value.
    });
    res.json(updatedFood);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
