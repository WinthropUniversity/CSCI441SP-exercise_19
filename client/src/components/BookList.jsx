import BookCard from './BookCard';

function BookList({ books, onToggleRead, onDelete }) {
  const readCount = books.filter((book) => book.isRead).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-800">Your Collection</h2>
        {books.length > 0 && (
          <p className="text-sm text-slate-500">
            <span className="font-bold text-teal-600">{readCount}</span>
            {' '}of{' '}
            <span className="font-bold text-teal-600">{books.length}</span>
            {' '}books read
          </p>
        )}
      </div>

      {books.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">📚</div>
          <p className="text-base">No books in your collection yet!</p>
          <p className="text-sm mt-1">Add your first book above.</p>
        </div>
      ) : (
        books.map((book) => (
          <BookCard
            key={book._id}
            title={book.title}
            author={book.author}
            isRead={book.isRead}
            onToggleRead={() => onToggleRead(book._id)}
            onDelete={() => onDelete(book._id)}
          />
        ))
      )}
    </div>
  );
}

export default BookList;
