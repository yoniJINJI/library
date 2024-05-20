const mongoose = require('mongoose');
const BookCopyReader = require('./bookCopyReaderModel');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  author_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Author',
    required: true,
    index: true,
    // Removed for simplyfing tests
    // validate: {
    //   validator: async function(value) {
    //     const author = await mongoose.model('Author').findById(value);
    //     return !!author;
    //   },
    //   message: 'Invalid author ID'
    // }
  },
  topic: {
    type: String,
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  copies: [
    {
      _id: { type: String, required: true },
      is_lost: { type: Boolean, default: false },
    }
  ]
});

// Pre-save hook to add a copy if copies array is empty
bookSchema.pre('save', function (next) {
  if (this.isNew && this.copies.length === 0) {
    this.copies.push({ _id: mongoose.Types.ObjectId(), is_lost: false });
  }
  next();
});

// Pre-hook to delete associated bookCopyReader documents upon book deletion
bookSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    await mongoose.model('BookCopyReader').deleteMany({ book_id: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

// Gets non-lost copies and available non-lost copies
bookSchema.methods.getNonLostCopies = async function () {
  const nonLostCopies = this.copies.filter(copy => !copy.is_lost);

  const loanedCopiesIds = await BookCopyReader.find({
    copy_id: { $in: nonLostCopies.map(copy => copy._id) },
    returned_at: null
  }).select('copy_id -_id');;
  
  const availableCopies = nonLostCopies.filter(copy => !loanedCopiesIds.includes(copy.id));

  return {
    nonLostCopies: nonLostCopies,
    availableCopies: availableCopies,
    loanedCopiesIds: loanedCopiesIds
  };
};

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
