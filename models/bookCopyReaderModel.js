const mongoose = require('mongoose');

const bookCopyReaderSchema = new mongoose.Schema({
  book_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
    index: true,
    validate: {
      validator: async function(value) {
        const book = await mongoose.model('Book').findById(value);
        return !!book;
      },
      message: 'Invalid book ID'
    }
  },
  reader_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reader',
    required: true,
    index: true,
    // Removed for simplyfing tests
    // validate: {
    //   validator: async function(value) {
    //     const reader = await mongoose.model('Reader').findById(value);
    //     return !!reader;
    //   },
    //   message: 'Invalid reader ID'
    // }
  },
  copy_id: { type: String, required: true },
  due_date: { type: Date, default: null },
  loaned_at: { type: Date, required: true },
  returned_at: { type: Date, default: null }
});
bookCopyReaderSchema.index({ reader_id: 1, returned_at: 1 }); // needed for counting reader active loans
bookCopyReaderSchema.index({ copy_id: 1, returned_at: 1 }); // needed for counting available copies of a book


// Pre-save hook to validate copy_id
bookCopyReaderSchema.pre('save', async function(next) {
  try {
    const book = await mongoose.model('Book').findOne({
      _id: this.book_id,
      'copies._id': this.copy_id
    });

    if (!book) {
      const error = new Error('Invalid copy_id: Copy does not exist in the specified book');
      error.name = 'ValidationError';
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Count currently loaned copies for a specific reader across all books
bookCopyReaderSchema.statics.countCurrentlyLoanedByReader = async function (readerId) {
  return await this.countDocuments({
    reader_id: readerId,
    returned_at: null
  });
};

const BookCopyReader = mongoose.model('BookCopyReader', bookCopyReaderSchema);

module.exports = BookCopyReader;
