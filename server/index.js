const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const bookRoutes = require('./routes/books');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/books', bookRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Book App API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
