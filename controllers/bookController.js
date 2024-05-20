const MAX_BOOKS_BORROWED = 5;
const DEFAULT_PAGES_NUM = 1;
const DEFAULT_NUM_BOOKS_IN_EACH_PAGE = 1;
const Book = require('../models/bookModel');
const BookCopyReader = require('../models/bookCopyReaderModel');
const mongoose = require('mongoose');

const createBook = async (req, res) => {
  const { title, author_id, topic, year } = req.body;
  if (!title || !author_id|| !topic|| !year) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const newBook = new Book({ title, author_id, topic, year });
    await newBook.save();
    res.status(201).json(newBook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllBooks = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || DEFAULT_PAGES_NUM;
    const limit = parseInt(req.query.limit) || DEFAULT_NUM_BOOKS_IN_EACH_PAGE;
    const skip = (page - 1) * limit;

    // Filters
    const filter = {};
    if (req.query.author_id) {
      filter.author_id = req.query.author_id;
    }
    if (req.query.topic) {
      filter.topic = req.query.topic;
    }
    if (req.query.year) {
      filter.year = req.query.year;
    }

    const booksQuery = Book.find(filter)
      .skip(skip)
      .limit(limit);

    const books = await booksQuery.exec();

    const totalBooks = await Book.countDocuments(filter);

    const totalPages = Math.ceil(totalBooks / limit);

    // Return the paginated result along with pagination metadata and filters
    res.json({
      books: books,
      currentPage: page,
      totalPages: totalPages,
      totalBooks: totalBooks,
      filters: {
        author_id: req.query.author_id || null,
        topic: req.query.topic || null,
        year: req.query.year || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('author_id');
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const { nonLostCopies, availableCopies } = await book.getNonLostCopies();

    res.json({
      book,
      authorName: book.author_id ? book.author_id.name : 'Author not found',
      totalNonLostCopies: nonLostCopies.length,
      availableNonLostCopies: availableCopies.length
    });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      res.status(404).json({ error: 'Book not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

const loanBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { reader_id } = req.body;
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const { availableCopies, loanedCopiesIds } = await book.getNonLostCopies();

    if (availableCopies.length === 0) {
      return res.status(400).json({ error: 'Book is not avaialble' });
    }
    const readerBooksCount = await BookCopyReader.countCurrentlyLoanedByReader(reader_id);
    if (readerBooksCount >= MAX_BOOKS_BORROWED) {
      return res.status(400).json({ error: `Reader already has ${MAX_BOOKS_BORROWED} books borrowed` });
    }

    const availableCopy = book.copies.find(copy => !loanedCopiesIds.includes(copy.id));
    const newBookCopyReader = new BookCopyReader({ 
      book_id: id, 
      reader_id: reader_id,
      copy_id: availableCopy.id,
      loaned_at: new Date(),
      // room for due_date logic
    });
    await newBookCopyReader.save();
    res.json({ message: 'Book loaned successfully' });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      res.status(404).json({ error: 'Book not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

const returnBook = async (req, res) => {
  try {
    const { id } = req.params; // Note: the server expects a COPY id. not a book id
    const copy = await BookCopyReader.findOne({ copy_id: id });
    if (!copy) {
      return res.status(404).json({ error: 'BookCopyReader not found' });
    }
    copy.returned_at = new Date();
    await copy.save();
    res.json({ message: 'Book returned successfully' });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      res.status(404).json({ error: 'Book not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    if (req.body.year !== undefined) {
      book.year = req.body.year;
    }
    if (req.body.author_id !== undefined) {
      book.author_id = req.body.author_id;
    }
    if (req.body.title !== undefined) {
      book.title = req.body.title;
    }
    if (req.body.topic !== undefined) {
      book.topic = req.body.topic;
    }
    await book.save();
    res.json(book);
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      res.status(404).json({ error: 'Book not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

const deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id); // this would delete the assoicated BookCopyReader as well
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createBook,
  getAllBooks,
  getBookById,
  loanBook,
  returnBook,
  updateBook,
  deleteBook
};
