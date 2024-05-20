const request = require('supertest');
const { app, server } = require('../app');
const mongoose = require('mongoose');
const Author = require('../models/authorModel');
const Reader = require('../models/readerModel');

describe('Server', () => {
  afterAll(async () => {
    await mongoose.disconnect();
    server.close();
  });

  describe('Book Controller', () => {
    let bookId;
    let copyId;
    const newAuthor = new Author({ name: 'author_name1' });
    newAuthor.save();
    const newReader = new Reader({ name: 'reader_name1' });
    newReader.save();
    const mockBook = { title: 'Test Book', author_id: newAuthor._id, topic: 'Test topic', year: 2024 };

    it('should create a new book', async () => {
      const res = await request(app)
        .post('/api/books')
        .send(mockBook);
      expect(res.statusCode).toEqual(201);
      expect(res.body.title).toEqual(mockBook.title);
      expect(res.body.author_id).toEqual(decodeURI(encodeURI(mockBook.author_id)));
      expect(res.body.topic).toEqual(mockBook.topic);
      expect(res.body.year).toEqual(mockBook.year);
      expect(res.body.copies).toBeInstanceOf(Array);
      expect(res.body.copies.length).toEqual(1);
      expect(res.body.copies[0]._id).toBeDefined();
      bookId = res.body._id; // Save book ID for future tests
      copyId = res.body.copies[0]._id; // Save copy ID for future tests
    });

    it('should return error for invalid input', async () => {
      const res = await request(app)
        .post('/api/books')
        .send({ title: '', author: '' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return list of books', async () => {
      const res = await request(app).get('/api/books');
      expect(res.statusCode).toEqual(200);
      expect(res.body.books).toBeInstanceOf(Array);
      expect(res.body.books.length).toEqual(1);
    });

    it('should return a book by ID', async () => {
      const res = await request(app).get(`/api/books/${bookId}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.book._id).toEqual(bookId);
      expect(res.body.authorName).toEqual(newAuthor.name);
    });

    it('should return error for non-existing ID', async () => {
      const res = await request(app).get('/api/books/nonexistent_id');
      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toBeDefined();
    });

    it('should loan a book to a reader', async () => {
      const res = await request(app)
        .put(`/api/books/${bookId}/loan`)
        .send({ reader_id: newReader._id });
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Book loaned successfully');
    });

    it('should return a book from loan', async () => {
      const res = await request(app)
        .put(`/api/books/${copyId}/return`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Book returned successfully');
    });

    it('should update a book', async () => {
      const res = await request(app)
        .put(`/api/books/${bookId}`)
        .send({ title: 'Updated Title' });
      expect(res.statusCode).toEqual(200);
      expect(res.body.title).toEqual('Updated Title');
    });

    it('should delete a book', async () => {
      const res = await request(app).delete(`/api/books/${bookId}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Book deleted successfully');
    });
  });
});
