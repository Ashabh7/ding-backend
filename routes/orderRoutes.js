const express = require("express");
const Order = require("../models/Order");

const router = express.Router();

//Get the Orders
router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get the Order by ID
router.get('/orders/:id', async(req,res) => {
    try{
        const order = await Order.findById(req.params.id)
        res.json(order)
    }
    catch (err) {
    res.status(500).json({ message: err.message });
  }
})

//Post the Order
router.post('/orders', async(req,res) => {
    try{
        const newOrder = new Order(req.body)
        await newOrder.save()
        res.json(newOrder)
    }
    catch (err) {
    res.status(500).json({ message: err.message });
  }
})

//Update the Order
router.put('/orders/:id', async(req,res) => {
    try{
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id,req.body,{new: true})
        res.json(updatedOrder)
    }
    catch (err) {
    res.status(500).json({ message: err.message });
  }
})

//Delete the Order
router.delete('/orders/:id', async(req,res) => {
    try{
        await Order.findByIdAndDelete(req.params.id)
        res.json({message: 'Order Deleted'})
    }
    catch (err) {
    res.status(500).json({ message: err.message });
  }
})



module.exports = router;
