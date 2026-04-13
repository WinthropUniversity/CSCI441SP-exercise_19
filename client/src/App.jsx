import { useState, useEffect } from 'react';
import BookForm from './components/BookForm';
import BookList from './components/BookList';

// Relative path — Nginx proxies /api/ to Express on port 5000 in production.
// The Vite dev proxy in vite.config.js handles this during development.
const API_URL = '/api/books';

function App() {
  const [books, setBooks] = useState([]);

  // Fetch all books from the API when the component first mounts
  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setBooks(data))
      .catch((err) => console.error('Failed to load books:', err));
  }, []);

  const handleAddBook = async ({ title, author }) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author }),
    });
    const newBook = await res.json();
    setBooks([newBook, ...books]);
  };

  const handleToggleRead = async (id) => {
    const res = await fetch(`${API_URL}/${id}`, { method: 'PUT' });
    const updated = await res.json();
    setBooks(books.map((b) => (b._id === id ? updated : b)));
  };

  const handleDeleteBook = async (id) => {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    setBooks(books.filter((b) => b._id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-teal-600 text-white py-8 text-center shadow-md">
        <h1 className="text-3xl font-bold tracking-tight">📖 My Book Collection</h1>
        <p className="text-teal-100 mt-1 text-sm">Track the books you've read</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <BookForm onAddBook={handleAddBook} />
        <BookList
          books={books}
          onToggleRead={handleToggleRead}
          onDelete={handleDeleteBook}
        />
      </main>
    </div>
  );
}

export default App;
