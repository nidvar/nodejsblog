require('dotenv').config();

const express = require('express');
const expressLayout = require('express-ejs-layouts');

const cookieParser = require('cookie-parser');
const session = require('express-session')
const MongoStore = require('connect-mongo');

const connectDB = require('./config/db');

const app = express();
const PORT = 5000 || process.env.PORT;

connectDB();

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(cookieParser());

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI
    }),
    cookie:{maxAge: new Date(Date.now() + (3600000))}
}));

app.use(express.static('public'));

app.use(expressLayout);
app.set('layout', './layouts/main');
app.set('view engine', 'ejs');

app.use('/', require('./routes/main'));

app.listen(PORT, ()=>{
    console.log(`App listneing on port ${PORT}`);
});