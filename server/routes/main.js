const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

const displayUsername = async function(cookies){
    let username = '';
    if(cookies.token){
        let user = await User.findOne({email:cookies.email.split('%40')});
        username = user.username;
    }
    return username;
}

const pickLayout = function(cookies){
    let layout = null;
    if(cookies){
        layout = '../views/layouts/admin';
    };
    return layout;
}

router.get('', async (req, res)=>{
    let perPage = 3;
    let currentPage = req.query.page || 1
    let previousPage = 0;
    let nextPage = currentPage + 1;
    let skip = currentPage * perPage - perPage;
    let lastPage = 0;
    try{
        let total = await Post.countDocuments();
        lastPage = Math.ceil(parseInt(total)/parseInt(perPage));
        const raw_data = await Post.aggregate([{$sort: {createdAt: -1}}]).skip(skip).limit(perPage).exec();
        previousPage = parseInt(currentPage) - 1;
        if(req._parsedOriginalUrl.search != null){
            let params = req._parsedOriginalUrl.search.split('=')[1];
            if(isNaN(params)){
                raw_data.splice(0, raw_data.length-1);
                raw_data.push({
                    title: 'ERROR'
                });
            };
            if(params <= 1){
                currentPage = 1;
            }else if(params >= 2){
                currentPage = parseInt(params);
                previousPage = parseInt(currentPage) - 1;
            }
            nextPage = parseInt(currentPage) + 1;
        };
        const data = [];
        let blurb = '';
        raw_data.forEach((item)=>{
            let dateObject = JSON.stringify(item.createdAt);
            let dateString = dateObject.split('T');
            let date = dateString[0].split('"')[1];
            let x = item.body.split(' ');
            if(x.length > 10){
                let y = x.splice(0, 10);
                y.push('......');
                blurb = y.join(' ');
            }else{
                blurb = x.join(' ');
            }
            const shallowCopy = Object.assign({}, item);
            shallowCopy.blurb = blurb;
            shallowCopy.date = date;
            data.push(shallowCopy);
        });
        let layout = pickLayout(req.cookies.token);
        let username = await displayUsername(req.cookies);

        res.render('index', {username, data, currentPage, previousPage, nextPage, lastPage, layout: layout});
    }catch(error){
        console.log(error);
        const data = [{
            title: 'ERROR',
            body: 'ERROR'
        }];
        res.render('index', {data, currentPage, previousPage, nextPage, lastPage});
    }
});

router.get('/post/:id', async (req, res)=>{
    try{
        const data = await Post.findById({_id: req.params.id});
        let username = await displayUsername(req.cookies);
        let layout = pickLayout(req.cookies.token);
        res.render('post', {data, username, layout:layout});
    }catch(error){
        res.render('post');
    }
})

router.post('/search', async (req, res)=>{
    try{
        let payload = req.body.searchTerm.trim() || 'error';
        const results = await Post.find({"title" : {$regex : payload.toLowerCase(), "$options": "i" }});
        let data = [];
        if(results.length == 0){
            data[0] = {title:'No results'};
        }else{
            data = results;
            data.forEach((item)=>{
                let dateObject = JSON.stringify(item.createdAt);
                let dateString = dateObject.split('T');
                let date = dateString[0].split('"')[1];
                item.date = date;
            })
        };
        let layout = pickLayout(req.cookies.token);
        let username = await displayUsername(req.cookies);
        res.render('searchResults', {data, layout, username});
    }catch(error){
        console.log(error, 'error !!!');
    }
})

router.get('/login', async (req, res)=>{
    const loginError = null;
    let username = await displayUsername(req.cookies);
    if(req.cookies.token){
        res.render('message', {layout: '../views/layouts/admin', username, message: 'You are already logged in'});
    }else{
        res.render('login', {loginError});
    }
});

router.post('/login', async (req, res)=>{
    try{
        const email = req.body.email;
        const password = req.body.password;
        const user = await User.findOne({email:email});
        const loginError = 'Invalid login';
        if(!user){
            res.render('login', {loginError});
            return
        };
        const validPassword = await bcrypt.compare(password, user.password);
        if(!validPassword){
            res.render('login', {loginError});
            return
        }
        const token = jwt.sign({userId: user._id}, jwtSecret);
        res.cookie('token', token, {httpOnly: true});
        res.cookie('email', req.body.email, {httpOnly: true});
        res.cookie('username', user.username, {httpOnly: true});
        res.redirect('/');
    }catch(error){
        console.log('catch error====', error);
    }
});

router.get('/register', async (req, res)=>{
    const registerError = null;
    let username = await displayUsername(req.cookies);
    if(req.cookies.token){
        res.render('message', {layout: '../views/layouts/admin', username, message:'You are already logged in'});
    }else{
        res.render('register', {registerError});
    }
});

router.post('/register', async (req, res)=>{
    let registerError = null;
    try{
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        const hashedPassword = await bcrypt.hash(password, 10);
        try{
            const emailExists = await User.findOne({email:email});
            const usernameExists = await User.findOne({username:username});
            if(!emailExists && !usernameExists && req.body.password.length > 3){
                await User.create(
                    {
                        username: username, 
                        password:hashedPassword, 
                        admin:false, 
                        email:email
                    }
                );
                res.render('message', {message:'Registration Successful'});
            }else{
                registerError = 'Invalid email / Username / Password';
                res.render('register', {registerError});
            }
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
});

router.get('/create', async (req, res)=>{
    let loginError = 'Please login to continue';
    let username = await displayUsername(req.cookies);
    if(req.cookies.token){
        res.render('create', {layout: '../views/layouts/admin', username});
    }else{
        res.render('login', {loginError});
    }
});

router.post('/create', async (req, res)=>{
    try{
    const title = req.body.title;
    const body = req.body.body;
    const username = req.cookies.username;
    const email = req.cookies.email;
        try{
            const emailExists = await User.findOne({email:email});
            const usernameExists = await User.findOne({username:username});
            if(emailExists && usernameExists){
                await Post.create(
                    {
                        title: title, 
                        body:body,
                        email:email,
                        username: username
                    }
                );
                res.render('message', {layout: '../views/layouts/admin', username, message:'Post created'});
            }else{
                res.render('message', {message:'There has been an error'});
            }
        }catch(error){
            console.log(error);
            res.status(500).json({message: 'Internal Error'})
        }
    }catch(error){
        console.log(error);
    }
});

router.get('/edit/:_id', async (req, res)=>{
    let username = await displayUsername(req.cookies);
    const post = await Post.findOne({_id:req.params._id});
    res.render('edit', {layout: '../views/layouts/admin', username, post});
})

router.post('/edit/:_id', async (req, res)=>{
    await Post.updateOne({ _id: req.params._id }, {$set: {body:req.body.body, title:req.body.title}});
    res.redirect('/');
})

router.post('/delete', async (req, res)=>{
    await Post.deleteOne({ _id: req.body._id});
    res.redirect('/');
});

router.get('/message', (req, res) => {
    let message = null;
    res.render('message', {message});
});

router.get('/logout', (req, res) => {
    res.clearCookie('token', 'email');
    res.redirect('/');
});

module.exports = router;
