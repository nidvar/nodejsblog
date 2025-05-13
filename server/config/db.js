const mongoose = require('mongoose');

const connectDB = async function(){
    try{
        mongoose.set('strictQuery', false);
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log('win!', conn.connection.host);
    }catch(error){
        console.log(error);
    }
}

module.exports = connectDB;