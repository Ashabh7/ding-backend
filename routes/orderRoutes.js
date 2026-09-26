const express = require("express");
const Order = require("../models/Order");
const Restaurant = require("../models/Restaurant");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Get the Orders
router.get("/orders", authMiddleware, async (req, res) => {
  try {
    let orders;

    if (req.user.role === "customer") {
      orders = await Order.find({ user: req.user.id });
    } else if (req.user.role === "restaurant") {
      const restaurant = await Restaurant.findOne({
        owner: req.user.id,
      });

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      orders = await Order.find({
        restaurant: restaurant._id,
      });
    } else if (req.user.role === "admin") {
      orders = await Order.find();
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get the Order by ID
router.get("/orders/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (req.user.role === "customer") {
      if (order.user.toString() !== req.user.id) {
        return res.status(403).json({
          message: "You can only view your own orders",
        });
      }
    } else if (req.user.role === "restaurant") {
      const restaurant = await Restaurant.findOne({
        owner: req.user.id,
      });

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      if (order.restaurant.toString() !== restaurant._id.toString()) {
        return res.status(403).json({
          message: "You can only view orders from your restaurant",
        });
      }
    }

    // Admin can view any order

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Post the Order
router.post(
  "/orders",
  authMiddleware,
  roleMiddleware(["customer"]),
  async (req, res) => {
    try {
      const newOrder = new Order({
        ...req.body,
        user: req.user.id,
      });

      await newOrder.save();

      res.json(newOrder);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// Update the Order
router.put("/orders/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // Customer cannot update orders
    if (req.user.role === "customer") {
      return res.status(403).json({
        message: "Customers cannot update orders",
      });
    }

    // Restaurant can only update orders from their own restaurant
    if (req.user.role === "restaurant") {
      const restaurant = await Restaurant.findOne({
        owner: req.user.id,
      });

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      if (order.restaurant.toString() !== restaurant._id.toString()) {
        return res.status(403).json({
          message: "You can only update orders from your restaurant",
        });
      }
    }

    // Admin can update any order

    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "out-for-delivery",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete the Order
router.delete("/orders/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // Customer cannot delete orders
    if (req.user.role === "customer") {
      return res.status(403).json({
        message: "Customers cannot delete orders",
      });
    }

    // Restaurant can only delete orders from their own restaurant
    if (req.user.role === "restaurant") {
      const restaurant = await Restaurant.findOne({
        owner: req.user.id,
      });

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      if (order.restaurant.toString() !== restaurant._id.toString()) {
        return res.status(403).json({
          message: "You can only delete orders from your restaurant",
        });
      }
    }

    // Admin can delete any order

    await Order.findByIdAndDelete(req.params.id);

    res.json({
      message: "Order Deleted",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
