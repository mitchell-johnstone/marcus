import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Movie } from '../types/movie';
import { EventContentArg } from '@fullcalendar/core';
import { useEffect, useRef, useState } from 'react';
import { useMovieVisibility } from '../contexts/MovieVisibilityContext';

type ComfortableMovieCalendarProps = {
    selectedDate: string;
    movies: Movie[];
};

interface SchedulePreferences {
    includeLunch: boolean;
    includeDinner: boolean;
    breakMinutes: number;
}

interface QuickSchedulePreset {
    label: string;
    description: string;
    preferences: SchedulePreferences;
}

// Add preset configurations
const QUICK_SCHEDULES: QuickSchedulePreset[] = [
    {
        label: "Family Day",
        description: "Perfect for families with kids - includes lunch and early dinner",
        preferences: {
            includeLunch: true,
            includeDinner: true,
            breakMinutes: 20
        }
    },
    {
        label: "Movie Marathon",
        description: "Maximum movies, no meal breaks",
        preferences: {
            includeLunch: false,
            includeDinner: false,
            breakMinutes: 20
        }
    },
    {
        label: "Evening Focus",
        description: "Concentrates movies after 5 PM, ",
        preferences: {
            includeLunch: true,
            includeDinner: false,
            breakMinutes: 20
        }
    },
    {
        label: "Dinner Plans",
        description: "Schedules around dinner time, perfect for dinner and a movie",
        preferences: {
            includeLunch: false,
            includeDinner: true,
            breakMinutes: 20
        }
    }
];

const convertTo24Hour = (time: string): string => {
    const [hours, minutes] = time.replace(/\s*(AM|PM)\s*$/i, '').split(':');
    const isPM = time.toLowerCase().includes('pm');

    let hour = parseInt(hours);
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;

    return `${String(hour).padStart(2, '0')}:${minutes}:00`;
};

const getMovieColor = (rating: string): string => {
    switch (rating) {
        case 'G':
            return '#4ade80'; // green
        case 'PG':
            return '#60a5fa'; // blue
        case 'PG-13':
            return '#f59e0b'; // amber
        case 'R':
            return '#ef4444'; // red
        default:
            return '#6b7280'; // gray
    }
};

const renderEventContent = (eventInfo: EventContentArg) => {
    const movie = eventInfo.event.extendedProps?.movie as Movie | undefined;

    // For meal breaks or events without movie data
    if (!movie) {
        return (
            <div className="p-1 text-xs">
                <div className="font-bold truncate">{eventInfo.event.title}</div>
            </div>
        );
    }

    return (
        <div className="p-1 text-xs">
            <div className="font-bold truncate">{eventInfo.event.title}</div>
            <div className="text-gray-600">{movie.rating} • {eventInfo.timeText}</div>
        </div>
    );
};

// Add to the existing interfaces at the top
interface ScheduleResult {
    familyEvents: any[];
    allEvents: any[];
}

// Add this helper function at the top level
const getMovieDurationInMinutes = (duration: string): number => {
    const match = duration.match(/(\d+)\s*hours?,\s*(\d+)\s*minutes?/i);
    if (!match) return 120;
    const [, hours, minutes] = match;
    return parseInt(hours) * 60 + parseInt(minutes);
};

// Add these utility functions
const createMealBlock = (selectedDate: string, startTime: string, title: string) => ({
    title,
    start: `${selectedDate}T${startTime}`,
    end: `${selectedDate}T${addMinutesToTime(startTime, 60)}`,
    backgroundColor: '#94a3b8', // slate-400
    display: 'background'
});

const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date(2024, 0, 1, hours, mins);
    date.setMinutes(date.getMinutes() + minutes);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
};

// Add this helper function near the other utility functions
const createBreakBlock = (startTime: Date, endTime: Date) => ({
    title: 'Break',
    start: startTime.toISOString(),
    end: endTime.toISOString(),
    backgroundColor: '#374151', // gray-700
    classNames: ['break-block'],
    display: 'background'
});

// Update the generateScheduleVariations function
const generateScheduleVariations = (
    movies: Movie[],
    selectedDate: string,
    isMovieVisible: (title: string) => boolean,
    preferences: SchedulePreferences
): ScheduleResult[] => {
    // Create a shuffled copy of the movies array with Fisher-Yates shuffle
    const shuffledMovies = [...movies].sort(() => Math.random() - 0.5);

    // Generate one variation with the shuffled movies
    const familySchedule = optimizeComfortableSchedule(
        true,
        shuffledMovies,
        preferences,
        isMovieVisible,
        selectedDate,
        Math.random() // Pass a random seed
    );

    const allMoviesSchedule = optimizeComfortableSchedule(
        false,
        shuffledMovies,
        preferences,
        isMovieVisible,
        selectedDate,
        Math.random() // Pass a different random seed
    );

    return [{
        familyEvents: familySchedule,
        allEvents: allMoviesSchedule
    }];
};

// Move preferences to module scope
const defaultPreferences: SchedulePreferences = {
    includeLunch: true,
    includeDinner: true,
    breakMinutes: 15
};

// Modify the optimizeComfortableSchedule function to accept preferences
const optimizeComfortableSchedule = (
    familyFriendlyOnly: boolean,
    moviesList: Movie[],
    prefs: SchedulePreferences = defaultPreferences,
    isMovieVisible: (title: string) => boolean,
    selectedDate: string,
    randomSeed: number = Math.random(),
    existingSchedule?: any[],
    ratedRTimes?: Set<string>
) => {
    const newEvents: any[] = [];

    // Add meal blocks
    if (prefs.includeLunch) {
        newEvents.push(createMealBlock(selectedDate, '12:00:00', 'Lunch Break'));
    }
    if (prefs.includeDinner) {
        newEvents.push(createMealBlock(selectedDate, '17:30:00', 'Dinner Break'));
    }

    // Filter movies based on rating and visibility
    let eligibleMovies = moviesList.filter(m =>
        isMovieVisible(m.title) &&
        (familyFriendlyOnly ?
            ['G', 'PG', 'PG-13'].includes(m.rating) :
            true
        )
    );

    // Create intervals
    let intervals = eligibleMovies.flatMap(movie => {
        const duration = getMovieDurationInMinutes(movie.duration);
        return movie.screenings.flatMap(screening =>
            screening.times.map(time => {
                const startTime = convertTo24Hour(time);
                const start = new Date(`${selectedDate}T${startTime}`);
                const end = new Date(start.getTime() + duration * 60000);
                return { start, end, movie, screening, time };
            })
        );
    });

    // If we have an existing schedule, try to match those times first
    if (existingSchedule) {
        intervals.sort((a, b) => {
            const aInExisting = existingSchedule.some(event =>
                event.extendedProps?.movie?.title === a.movie.title &&
                event.start === a.start.toISOString()
            );
            const bInExisting = existingSchedule.some(event =>
                event.extendedProps?.movie?.title === b.movie.title &&
                event.start === b.start.toISOString()
            );

            if (aInExisting && !bInExisting) return -1;
            if (!aInExisting && bInExisting) return 1;
            return a.start.getTime() - b.start.getTime();
        });
    } else {
        // Original sorting logic for first schedule
        intervals.sort((a, b) => {
            const timeA = a.start.getTime();
            const timeB = b.start.getTime();
            if (Math.abs(timeA - timeB) <= 30 * 60 * 1000) {
                return randomSeed - 0.5;
            }
            return timeA - timeB;
        });
    }

    // Rest of the scheduling logic remains the same...
    const scheduledMovies = new Set<string>();
    const scheduledTimeSlots = new Set<string>();
    let lastEndTime = new Date(`${selectedDate}T09:00:00`);

    intervals.forEach(interval => {
        if (scheduledMovies.has(interval.movie.title)) return;

        // Add break time to the last end time
        const minimumStartTime = new Date(lastEndTime.getTime() + prefs.breakMinutes * 60000);
        if (interval.start < minimumStartTime) return;

        const timeKey = `${interval.start.toISOString()}-${interval.end.toISOString()}`;
        if (scheduledTimeSlots.has(timeKey)) return;

        // For family schedule, skip times where R-rated movies are showing
        if (familyFriendlyOnly && ratedRTimes?.has(timeKey)) return;

        // Skip if this movie is already scheduled at a different time in the other schedule
        if (familyFriendlyOnly && existingSchedule?.some(event =>
            event.extendedProps?.movie?.title === interval.movie.title &&
            event.start !== interval.start.toISOString()
        )) return;

        const conflictsWithMeals =
            (prefs.includeLunch &&
                interval.start <= new Date(`${selectedDate}T13:00:00`) &&
                interval.end >= new Date(`${selectedDate}T12:00:00`)) ||
            (prefs.includeDinner &&
                interval.start <= new Date(`${selectedDate}T18:30:00`) &&
                interval.end >= new Date(`${selectedDate}T17:30:00`));

        if (conflictsWithMeals) return;

        // Add a break block if this isn't the first movie and there's a break
        if (lastEndTime.getTime() > new Date(`${selectedDate}T09:00:00`).getTime() && prefs.breakMinutes > 0) {
            newEvents.push(createBreakBlock(lastEndTime, minimumStartTime));
        }

        newEvents.push({
            title: `${interval.movie.title} (${interval.screening.screen})`,
            start: interval.start.toISOString(),
            end: interval.end.toISOString(),
            backgroundColor: getMovieColor(interval.movie.rating),
            extendedProps: { movie: interval.movie }
        });

        scheduledMovies.add(interval.movie.title);
        scheduledTimeSlots.add(timeKey);
        lastEndTime = interval.end;
    });

    return newEvents;
};

export default function ComfortableMovieCalendar({ selectedDate, movies }: ComfortableMovieCalendarProps) {
    const familyCalendarRef = useRef<FullCalendar | null>(null);
    const allMoviesCalendarRef = useRef<FullCalendar | null>(null);
    const [isCalendarVisible, setIsCalendarVisible] = useState(true);
    const { isMovieVisible } = useMovieVisibility();
    const [familyEvents, setFamilyEvents] = useState<any[]>([]);
    const [allEvents, setAllEvents] = useState<any[]>([]);
    const [preferences, setPreferences] = useState<SchedulePreferences>(defaultPreferences);
    const [currentVariationIndex, setCurrentVariationIndex] = useState(0);

    useEffect(() => {
        [familyCalendarRef, allMoviesCalendarRef].forEach(ref => {
            if (ref.current) {
                const calendarApi = ref.current.getApi();
                calendarApi.gotoDate(selectedDate);
            }
        });
    }, [selectedDate]);

    useEffect(() => {
        // Generate all-movies schedule first, prioritizing R-rated movies
        const allMoviesSchedule = optimizeComfortableSchedule(
            false,
            movies,
            preferences,
            isMovieVisible,
            selectedDate
        );

        // Filter out the times where R-rated movies are scheduled
        const ratedRTimes = new Set(
            allMoviesSchedule
                .filter(event => event.extendedProps?.movie?.rating === 'R')
                .map(event => `${event.start}-${event.end}`)
        );

        // Generate family schedule avoiding R-rated movie times
        const familySchedule = optimizeComfortableSchedule(
            true,
            movies.filter(m => ['G', 'PG', 'PG-13'].includes(m.rating)),
            preferences,
            isMovieVisible,
            selectedDate,
            Math.random(),
            allMoviesSchedule,
            ratedRTimes
        );

        setFamilyEvents(familySchedule);
        setAllEvents(allMoviesSchedule);
    }, [selectedDate, movies, preferences, isMovieVisible]);

    const handleNextVariation = () => {
        // Always generate a new schedule when clicking next
        const newVariation = generateScheduleVariations(
            movies,
            selectedDate,
            isMovieVisible,
            preferences
        )[0];

        if (newVariation) {
            setFamilyEvents(newVariation.familyEvents);
            setAllEvents(newVariation.allEvents);
            setCurrentVariationIndex(prev => prev + 1);
        }
    };

    const handleShuffle = () => {
        // Don't reset the counter, just increment it like handleNextVariation does
        const newVariation = generateScheduleVariations(
            movies,
            selectedDate,
            isMovieVisible,
            preferences
        )[0];

        if (newVariation) {
            setFamilyEvents(newVariation.familyEvents);
            setAllEvents(newVariation.allEvents);
            setCurrentVariationIndex(prev => prev + 1); // Increment instead of resetting
        }
    };

    // Rest of the component (UI, controls, etc.)
    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
            <button
                onClick={() => setIsCalendarVisible(!isCalendarVisible)}
                className="w-full px-6 py-6 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
                <h2 className="text-lg font-semibold text-gray-800">Comfortable Schedule</h2>
                <svg
                    className={`w-5 h-5 transform transition-transform ${isCalendarVisible ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Update the controls section styling */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="space-y-4">
                    {/* Quick Schedule Presets */}
                    <div className="flex gap-3 overflow-x-auto -mx-3 px-3">
                        {QUICK_SCHEDULES.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => setPreferences(preset.preferences)}
                                className="relative inline-flex items-center px-4 py-2 rounded-md
                           bg-white border border-gray-200 shadow-sm
                           hover:bg-gray-50 hover:border-gray-300
                           active:bg-gray-100 
                           focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
                           transition-all duration-200
                           group whitespace-nowrap flex-shrink-0
                           my-1"
                                title={preset.description}
                            >
                                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                    {preset.label}
                                </span>
                                {preset.label === "Movie Marathon" && (
                                    <span className="ml-2">🎬</span>
                                )}
                                {preset.label === "Family Day" && (
                                    <span className="ml-2">👨‍👩‍👧‍👦</span>
                                )}
                                {preset.label === "Evening Focus" && (
                                    <span className="ml-2">🌙</span>
                                )}
                                {preset.label === "Dinner Plans" && (
                                    <span className="ml-2">🍽️</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Custom Preferences */}
                    <div className="flex flex-wrap gap-3 text-sm">
                        <div className="relative inline-flex items-center px-4 py-2 rounded-md
                           bg-white border border-gray-200 shadow-sm
                           hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={preferences.includeLunch}
                                    onChange={e => setPreferences(p => ({ ...p, includeLunch: e.target.checked }))}
                                    className="rounded text-blue-600 w-4 h-4"
                                />
                                <span>Include Lunch Break</span>
                            </label>
                        </div>

                        <div className="relative inline-flex items-center px-4 py-2 rounded-md
                           bg-white border border-gray-200 shadow-sm
                           hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={preferences.includeDinner}
                                    onChange={e => setPreferences(p => ({ ...p, includeDinner: e.target.checked }))}
                                    className="rounded text-blue-600 w-4 h-4"
                                />
                                <span>Include Dinner Break</span>
                            </label>
                        </div>


                        <div className="relative inline-flex items-center px-4 py-2 rounded-md
                           bg-white border border-gray-200 shadow-sm
                           hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100">
                            <label className="flex items-center space-x-2">
                                <span>Break between movies:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={preferences.breakMinutes}
                                    onChange={e => setPreferences(p => ({
                                        ...p,
                                        breakMinutes: Math.max(0, Math.min(60, parseInt(e.target.value) || 0))
                                    }))}
                                    className="w-8 rounded border-gray-300 shadow-sm 
                          focus:border-blue-500 focus:ring-blue-500"
                                />
                                <span>minutes</span>
                            </label>
                        </div>
                    </div>

                    {/* Variation Controls */}
                    <div className="flex gap-3 items-center">
                        <button
                            onClick={handleShuffle}
                            className="px-3 py-1.5 bg-purple-500 text-white rounded-md shadow-sm 
                       hover:bg-purple-600 focus:outline-none focus:ring-2 
                       focus:ring-purple-500 focus:ring-offset-2 transition-colors text-sm"
                        >
                            🎲 Shuffle Schedules
                        </button>

                        {currentVariationIndex > 0 && (
                            <button
                                onClick={handleNextVariation}
                                className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md shadow-sm 
                          hover:bg-purple-200 focus:outline-none focus:ring-2 
                          focus:ring-purple-500 focus:ring-offset-2 transition-colors text-sm"
                            >
                                Next Variation #{currentVariationIndex + 1}
                            </button>
                        )}

                        <span className="text-sm text-gray-500">
                            {familyEvents.length + allEvents.length} movies total
                        </span>
                    </div>
                </div>
            </div>

            <div className={`transition-all duration-300 ${isCalendarVisible ? 'p-6' : 'h-0 p-0 overflow-hidden'}`}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-lg font-semibold mb-4">Family-Friendly Schedule</h4>
                        <FullCalendar
                            ref={familyCalendarRef}
                            plugins={[timeGridPlugin]}
                            initialView="timeGridDay"
                            initialDate={selectedDate}
                            headerToolbar={false}
                            slotMinTime="09:00:00"
                            slotMaxTime="24:00:00"
                            height="auto"
                            allDaySlot={false}
                            events={familyEvents}
                            eventContent={renderEventContent}
                            slotDuration="00:30:00"
                        />
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold mb-4">All Movies Schedule</h4>
                        <FullCalendar
                            ref={allMoviesCalendarRef}
                            plugins={[timeGridPlugin]}
                            initialView="timeGridDay"
                            initialDate={selectedDate}
                            headerToolbar={false}
                            slotMinTime="09:00:00"
                            slotMaxTime="24:00:00"
                            height="auto"
                            allDaySlot={false}
                            events={allEvents}
                            eventContent={renderEventContent}
                            slotDuration="00:30:00"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
} 