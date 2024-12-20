import { useState } from 'react';
import movieDatabaseJSON from '../lib/movie-data.json';
import MovieCalendar from '../components/MovieCalendar';
import OptimizedMovieCalendar from '../components/OptimizedMovieCalendar';
import { MovieDatabase } from '../types/movie';
import { MovieVisibilityProvider } from '../contexts/MovieVisibilityContext';
import MovieFilter from '../components/MovieFilter';

const movieDatabase: MovieDatabase = movieDatabaseJSON;

export default function Home() {
    const projectName = 'Marcus Movie Day';
    const [loading, setLoading] = useState(false);
    const availableDates = Object.keys(movieDatabase);
    const [selectedDate, setSelectedDate] = useState(availableDates[0]);
    const [movies, setMovies] = useState(movieDatabase[selectedDate] || []);

    const handleDateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setLoading(true);
        const newDate = event.target.value;
        setSelectedDate(newDate);
        setTimeout(() => {
            setMovies(movieDatabase[newDate] || []);
            setLoading(false);
        }, 250);
    };

    return (
        <MovieVisibilityProvider>
            <main className="min-h-screen bg-[#f5f7fa]">
                <nav className="bg-white shadow-md">
                    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-800">{projectName}</h1>
                        <select 
                            value={selectedDate} 
                            onChange={handleDateChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white"
                        >
                            {availableDates.map(date => (
                                <option key={date} value={date}>
                                    {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </option>
                            ))}
                        </select>
                    </div>
                </nav>

                <div className="container mx-auto px-4 py-8">
                    <MovieFilter movies={movies} />
                    
                    <MovieCalendar 
                        selectedDate={selectedDate}
                        movies={movies}
                    />
                    
                    <OptimizedMovieCalendar 
                        selectedDate={selectedDate}
                        movies={movies}
                    />

                    {loading ? (
                        <div className="text-center p-8 text-gray-500">Loading movies...</div>
                    ) : movies.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">No movies found for selected date.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {movies.map((movie, index) => (
                                <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl">
                                    {movie.poster && (
                                        <div className="relative">
                                            <img 
                                                src={movie.poster} 
                                                alt={movie.title}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        </div>
                                    )}
                                    <div className="p-6">
                                        <h2 className="text-xl font-bold mb-3 text-gray-900">{movie.title}</h2>
                                        <div className="flex gap-3 mb-4">
                                            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">{movie.rating}</span>
                                            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">{movie.duration}</span>
                                        </div>
                                        <div className="space-y-4">
                                            {movie.screenings.map((screening, idx) => (
                                                <div key={idx}>
                                                    <p className="font-semibold text-sm text-gray-700 mb-2">{screening.screen}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {screening.times.map((time, timeIdx) => (
                                                            <span 
                                                                key={timeIdx}
                                                                className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-100 cursor-pointer transition-colors"
                                                            >
                                                                {time}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </MovieVisibilityProvider>
    );
} 