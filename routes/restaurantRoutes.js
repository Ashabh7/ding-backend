const express = require('express')
const Restaurant = require('../models/Restaurant')

const router = express.Router()

//Get the restaurant
router.get('/restaurants', async(req,res) => {
    try{
        const restaurants = await Restaurant.find()
        res.json(restaurants)
    }
    catch(err){
        res.status(500).json({message: err.message})
    }
})

//Post the Restaurant
router.post('/restaurants', async(req,res)=> {
    try{
        const newRestaurant = new Restaurant(req.body)
        await newRestaurant.save()
        res.json(newRestaurant)
    }
    catch(err){
        res.status(500).json({message: err.message})
    }
})

module.exports = router