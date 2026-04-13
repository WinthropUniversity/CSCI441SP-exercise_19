import { useState } from 'react';

function BookForm({ onAddBook }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;
    onAddBook({ title: title.trim(), author: author.trim() });
    setTitle('');
    setAuthor('');
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
      <h2 className="text-base font-semibold text-slate-700 mb-3">Add a New Book</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Book title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 min-w-40 px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
        <input
          type="text"
          placeholder="Author name"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="flex-1 min-w-40 px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
        <button
          type="submit"
          className="px-5 py-2 bg-teal-600 text-white text-sm font-semibold rounded-md hover:bg-teal-700 transition-colors"
        >
          Add Book
        </button>
      </form>
    </div>
  );
}

export default BookForm;
