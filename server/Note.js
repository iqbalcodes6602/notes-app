const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    content: String,
    position: {
        x: Number,
        y: Number
    },
    color: String,
    roomId: String // Add this field
});

module.exports = mongoose.model('Note', NoteSchema);
