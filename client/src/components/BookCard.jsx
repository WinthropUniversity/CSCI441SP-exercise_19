function BookCard({ title, author, isRead, onToggleRead, onDelete }) {
  return (
    <div
      className={`flex justify-between items-center p-4 rounded-lg shadow-sm border-l-4 bg-white mb-3 transition-transform hover:-translate-y-0.5 hover:shadow-md ${
        isRead ? 'border-green-500 bg-green-50' : 'border-amber-400'
      }`}
    >
      <div>
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          {title}
          {isRead && (
            <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              ✓ Read
            </span>
          )}
        </h3>
        <p className="text-sm text-slate-500 mt-0.5">by {author}</p>
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={onToggleRead}
          className="px-3 py-1.5 text-sm font-semibold border border-teal-600 text-teal-600 rounded-md hover:bg-teal-600 hover:text-white transition-colors"
        >
          {isRead ? 'Mark Unread' : 'Mark Read'}
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm font-semibold border border-red-500 text-red-500 rounded-md hover:bg-red-500 hover:text-white transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default BookCard;
