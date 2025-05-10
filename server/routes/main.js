const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

const locals = {
    title: 'NodeJS & MongoDB',
    description: 'Simple Full stack'
};

//
router.get('', async (req, res)=>{
    let perPage = 5;
    let currentPage = req.query.page || 1
    let previousPage = 0;
    let nextPage = currentPage + 1;
    let skip = currentPage * perPage - perPage;
    let lastPage = 0;

    try{
        let total = await Post.countDocuments();
        lastPage = parseInt(total)/parseInt(perPage);
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
            let x = item.body.split(' ');
            if(x.length > 10){
                let y = x.splice(0, 10);
                y.push('......');
                blurb = y.join(' ');
            }
            const shallowCopy = Object.assign({}, item);
            shallowCopy.blurb = blurb;
            data.push(shallowCopy);
        });
        res.render('index', {locals, data, currentPage, previousPage, nextPage, lastPage});
    }catch(error){
        console.log(error);
        const data = [{
            title: 'ERROR',
            body: 'ERROR'
        }];
        res.render('index', {locals, data, currentPage, previousPage, nextPage, lastPage});
    }
});

router.get('/post/:id', async (req, res)=>{
    try{
        const data = await Post.findById({_id: req.params.id});
        res.render('post', {locals, data});
    }catch(error){
        res.render('post', {locals});
    }
})

router.post('/search', async (req, res)=>{
    try{
        let payload = req.body.searchTerm || 'error';
        const result = await Post.find({"title" : {$regex : payload}});
        let data = '';

        if(result.length == 0){
            data = {
                title:'ERROR',
                body:'ERROR'
            }
        }else{
            data = result[0];
        }
        res.render('searchResults', {data});
    }catch(error){
        console.log(error, 'error !!!');
    }
})

router.get('/login', (req, res)=>{
    res.render('login');
});

router.get('/register', (req, res)=>{
    res.render('register');
});

function insertPostData(){
    fetch('https://dummyjson.com/posts')
    .then(res => res.json())
    .then((res)=>{
        let x = [];
        res.posts.forEach((item)=>{
            x.push({title:item.title, body:item.body})
        });
        // Post.insertMany(x);
    });
}

module.exports = router;