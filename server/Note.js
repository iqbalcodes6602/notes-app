// Note Schema
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    content: String,
    position: {
        x: Number,
        y: Number
    },
    color: String
});
module.exports = mongoose.model('Note', noteSchema);