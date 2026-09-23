require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const foodRoutes = require('./routes/foodRoutes')
const userRoutes = require('./routes/userRoutes')
const restaurantRoutes = require('./routes/restaurantRoutes')
const orderRoutes = require('./routes/orderRoutes')

const app = express();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("Connection Error: ", err));

app.use(cors());
app.use(express.json());
app.use(foodRoutes)
app.use(userRoutes)
app.use(restaurantRoutes)
app.use(orderRoutes)

app.get("/", (req, res) => {
  res.json({ message: "Ding! API is Running" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server Running on ${PORT}`);
});
