const express = require("express");
const Order = require("../models/Order");
const Restaurant = require("../models/Restaurant");
const Food = require("../models/Food");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Get the Orders
router.get("/orders", authMiddleware, async (req, res) => {
  try {
    let orders;

    if (req.user.role === "customer") {
      orders = await Order.find({ user: req.user.id })
        .populate("restaurant", "name")
        .populate("items.food", "name price");
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
      })
        .populate("restaurant", "name")
        .populate("items.food", "name price");
    } else if (req.user.role === "admin") {
      orders = await Order.find()
        .populate("restaurant", "name")
        .populate("items.food", "name price");
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
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          message: "Order must contain at least one item",
        });
      }

      if (!req.body.deliveryAddress?.trim()) {
        return res.status(400).json({
          message: "Delivery address is required",
        });
      }

      let restaurant;

      try {
        restaurant = await Restaurant.findById(req.body.restaurant);
      } catch (err) {
        if (err.name === "CastError") {
          return res.status(400).json({
            message: "Invalid restaurant ID",
          });
        }

        throw err;
      }

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      const orderItems = await Promise.all(
        items.map(async (item) => {
          if (!item.food) {
            const error = new Error("Food is required");
            error.status = 400;
            throw error;
          }

          if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            const error = new Error("Quantity must be a positive integer");
            error.status = 400;
            throw error;
          }

          let food;

          try {
            food = await Food.findById(item.food);
          } catch (err) {
            if (err.name === "CastError") {
              const error = new Error("Invalid food ID");
              error.status = 400;
              throw error;
            }

            throw err;
          }

          if (!food) {
            const error = new Error("Food not found");
            error.status = 404;
            throw error;
          }

          if (food.restaurant.toString() !== restaurant._id.toString()) {
            const error = new Error("Food does not belong to this restaurant");
            error.status = 400;
            throw error;
          }

          return {
            food: food._id,
            quantity: item.quantity,
            price: food.price,
          };
        }),
      );

      const totalAmount = orderItems.reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0);

      const newOrder = new Order({
        user: req.user.id,
        restaurant: restaurant._id,
        items: orderItems,
        totalAmount: totalAmount,
        deliveryAddress: req.body.deliveryAddress,
      });

      await newOrder.save();

      res.json(newOrder);
    } catch (err) {
      res.status(err.status || 500).json({
        message: err.message,
      });
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
    res.status(500).json({
      message: err.message,
    });
  }
});

module.exports = router;