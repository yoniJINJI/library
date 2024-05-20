const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    } // other properties might come here in the future
});

const Author = mongoose.model('Author', authorSchema);

module.exports = Author;
