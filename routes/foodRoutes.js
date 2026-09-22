const express = require("express");
const Food = require("../models/Food");

const router = express.Router();

//Get
router.get("/foods", async (req, res) => {
  try {
    const foods = await Food.find();
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Post new Food
router.post("/foods", async (req, res) => {
  try {
    const newFood = new Food(req.body);
    await newFood.save();
    res.json(newFood);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
