const express = require("express");
const { Readable } = require("stream");

const Restaurant = require("../models/Restaurant");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const upload = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

// Upload an image buffer to Cloudinary
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "ding/restaurants",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      },
    );

    Readable.from(buffer).pipe(stream);
  });
}

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
      const { name, image, owner, location } = req.body || {};

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
        name: name.trim(),
        image: image || "",
        owner,
        location: {
          street: location.street.trim(),
          city: location.city.trim(),
          pincode: location.pincode.trim(),
        },
      });

      await newRestaurant.save();

      res.status(201).json(newRestaurant);
    } catch (err) {
      console.error("Create restaurant error:", err);
      res.status(500).json({
        message: "Failed to create restaurant",
      });
    }
  },
);

// Update restaurant, including optional image upload
router.put(
  "/restaurants/:id",
  authMiddleware,
  roleMiddleware(["restaurant", "admin"]),
  upload.single("image"),
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

      const body = req.body || {};
      const { name } = body;
      const updates = {};

      // Update restaurant name
      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          return res.status(400).json({
            message: "Restaurant name cannot be empty",
          });
        }

        updates.name = name.trim();
      }

      // Upload a newly selected image to Cloudinary
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        updates.image = result.secure_url;
      } else if (body.image !== undefined) {
        // Support existing URL-based image updates
        if (typeof body.image !== "string") {
          return res.status(400).json({
            message: "Invalid restaurant image URL",
          });
        }

        updates.image = body.image.trim();
      }

      // Support JSON location objects and FormData fields
      let location = body.location;

      if (typeof location === "string") {
        try {
          location = JSON.parse(location);
        } catch {
          return res.status(400).json({
            message: "Invalid location data",
          });
        }
      }

      if (
        body.street !== undefined ||
        body.city !== undefined ||
        body.pincode !== undefined
      ) {
        location = {
          street: body.street,
          city: body.city,
          pincode: body.pincode,
        };
      }

      if (location !== undefined) {
        if (
          !location ||
          typeof location.street !== "string" ||
          typeof location.city !== "string" ||
          typeof location.pincode !== "string" ||
          !location.street.trim() ||
          !location.city.trim() ||
          !location.pincode.trim()
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

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          message: "No restaurant changes provided",
        });
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

      console.error("Restaurant update error:", err);

      res.status(500).json({
        message: "Failed to update restaurant",
      });
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