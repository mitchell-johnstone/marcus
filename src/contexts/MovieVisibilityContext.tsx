import { createContext, useContext, useState, ReactNode } from 'react';

interface MovieVisibilityContextType {
  hiddenMovies: Set<string>;
  toggleMovie: (movieTitle: string) => void;
  isMovieVisible: (movieTitle: string) => boolean;
}

const MovieVisibilityContext = createContext<MovieVisibilityContextType | null>(null);

export function MovieVisibilityProvider({ children }: { children: ReactNode }) {
  const [hiddenMovies, setHiddenMovies] = useState<Set<string>>(new Set());

  const toggleMovie = (movieTitle: string) => {
    setHiddenMovies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(movieTitle)) {
        newSet.delete(movieTitle);
      } else {
        newSet.add(movieTitle);
      }
      return newSet;
    });
  };

  const isMovieVisible = (movieTitle: string) => !hiddenMovies.has(movieTitle);

  return (
    <MovieVisibilityContext.Provider value={{ hiddenMovies, toggleMovie, isMovieVisible }}>
      {children}
    </MovieVisibilityContext.Provider>
  );
}

export function useMovieVisibility() {
  const context = useContext(MovieVisibilityContext);
  if (!context) {
    throw new Error('useMovieVisibility must be used within a MovieVisibilityProvider');
  }
  return context;
} 