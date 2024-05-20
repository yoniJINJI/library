const mongoose = require('mongoose');

const readerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    } // other properties might come here in the future
});

const Reader = mongoose.model('Reader', readerSchema);

module.exports = Reader;
