const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    avatar: String,
    settings: {
        timezone: { type: String, default: 'Asia/Kolkata' },
        availability: Object // e.g. { monday: ["18:00-20:00"], ... }
    }
}, { timestamps: true });


module.exports = mongoose.model('User', userSchema);