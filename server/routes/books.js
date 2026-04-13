const express = require('express');
const router = express.Router();
const Book = require('../models/Book');

// GET /api/books — return all books
router.get('/', async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/books — create a new book
router.post('/', async (req, res) => {
  try {
    const book = await Book.create({
      title: req.body.title,
      author: req.body.author,
    });
    res.status(201).json(book);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: 'Validation failed', messages });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/books/:id — toggle isRead
router.put('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    book.isRead = !book.isRead;
    await book.save();
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/books/:id — remove a book
router.delete('/:id', async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
