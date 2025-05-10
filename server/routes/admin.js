const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/register', async (req, res)=>{
    try{
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        const hashedPassword = await bcrypt.hash(password, 10);
    try{
        const user = await User.create(
            {
                username: username, 
                password:hashedPassword, 
                admin:false, 
                email:email
            }
        );
        res.status(201).json({message: 'User Created', user});
    }catch(error){
        console.log(error);
        if(error.code === 11000){
            res.status(409).json({message:'User already in use'})
        }
        res.status(500).json({message: 'Internal Error'})
    }
    }catch(error){
        console.log(error);
    }
})

module.exports = router;