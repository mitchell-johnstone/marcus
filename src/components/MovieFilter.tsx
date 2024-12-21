import { Movie } from '../types/movie';
import { useMovieVisibility } from '../contexts/MovieVisibilityContext';

interface MovieFilterProps {
  movies: Movie[];
}

export default function MovieFilter({ movies }: MovieFilterProps) {
  const { toggleMovie, isMovieVisible } = useMovieVisibility();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Filter Movies</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <label 
            key="Show/Hide All" 
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={movies.every(movie => isMovieVisible(movie.title))}
                onChange={() => {
                    if(movies.every(movie => isMovieVisible(movie.title)) || movies.every(movie => !isMovieVisible(movie.title))) {
                        movies.forEach(movie => toggleMovie(movie.title));
                    } else {
                        movies.filter(movie => isMovieVisible(movie.title)).forEach(movie => toggleMovie(movie.title));
                    }
                }}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 
                          bg-white checked:bg-blue-500 checked:border-0 
                          transition-colors duration-200 ease-in-out
                          focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <svg
                className="absolute h-3.5 w-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3.5 8 7 12 14 5"></polyline>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                Show/Hide All
              </span>
            </div>
          </label>
        {movies.map((movie) => (
          <label 
            key={movie.title} 
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={isMovieVisible(movie.title)}
                onChange={() => toggleMovie(movie.title)}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 
                          bg-white checked:bg-blue-500 checked:border-0 
                          transition-colors duration-200 ease-in-out
                          focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <svg
                className="absolute h-3.5 w-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3.5 8 7 12 14 5"></polyline>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {movie.title}
              </span>
              <span className="text-xs text-gray-500">
                {movie.rating} • {movie.duration}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
} 