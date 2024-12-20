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
  pushRatedR: boolean;
}

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
      return '#22c55e'; // green-500
    case 'PG':
      return '#3b82f6'; // blue-500
    case 'PG-13':
      return '#f59e0b'; // amber-500
    case 'R':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
};

const renderEventContent = (eventInfo: EventContentArg) => {
  const movie = eventInfo.event.extendedProps?.movie as Movie | undefined;
  
  // For meal breaks or events without movie data
  if (!movie) {
    return (
      <div className="p-2">
        <div className="font-medium">{eventInfo.event.title}</div>
      </div>
    );
  }

  return (
    <div className={`p-2 ${eventInfo.event.classNames}`}>
      <div className="font-medium">{eventInfo.event.title}</div>
      <div className="text-sm opacity-75">
        {movie.rating} • {movie.duration}
      </div>
    </div>
  );
};

export default function ComfortableMovieCalendar({ selectedDate, movies }: ComfortableMovieCalendarProps) {
  const familyCalendarRef = useRef<FullCalendar | null>(null);
  const allMoviesCalendarRef = useRef<FullCalendar | null>(null);
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);
  const { isMovieVisible } = useMovieVisibility();
  const [familyEvents, setFamilyEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<SchedulePreferences>({
    includeLunch: true,
    includeDinner: true,
    pushRatedR: true
  });

  useEffect(() => {
    [familyCalendarRef, allMoviesCalendarRef].forEach(ref => {
      if (ref.current) {
        const calendarApi = ref.current.getApi();
        calendarApi.gotoDate(selectedDate);
      }
    });
  }, [selectedDate]);

  useEffect(() => {
    const familySchedule = optimizeComfortableSchedule(true);
    const allMoviesSchedule = optimizeComfortableSchedule(false);
    setFamilyEvents(familySchedule);
    setAllEvents(allMoviesSchedule);
  }, [selectedDate, movies, preferences, isMovieVisible]);

  // Function to calculate movie duration in minutes
  const getMovieDurationInMinutes = (duration: string): number => {
    const match = duration.match(/(\d+)\s*hours?,\s*(\d+)\s*minutes?/i);
    if (!match) return 120;
    const [, hours, minutes] = match;
    return parseInt(hours) * 60 + parseInt(minutes);
  };

  const createMealBlock = (startTime: string, title: string) => ({
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

  // Helper function to check if a time slot conflicts with existing movies
  const conflictsWithExisting = (startTime: string, endTime: string, currentEvents: any[]) => {
    const start = new Date(`${selectedDate}T${startTime}`);
    const end = new Date(`${selectedDate}T${endTime}`);

    // Find all overlapping movies at this time
    const overlappingMovies = currentEvents.filter(event => {
      if (event.display === 'background') return false; // Skip meal times
      
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      return !(end <= eventStart || start >= eventEnd);
    });

    return overlappingMovies.length > 0;
  };

  const optimizeComfortableSchedule = (familyFriendlyOnly: boolean) => {
    const newEvents: any[] = [];
    
    // Add meal blocks first
    if (preferences.includeLunch) {
      newEvents.push(createMealBlock('12:00:00', 'Lunch Break'));
    }
    if (preferences.includeDinner) {
      newEvents.push(createMealBlock('17:30:00', 'Dinner Break'));
    }

    let intervals: Array<{
      start: Date,
      end: Date,
      movie: Movie,
      screening: { screen: string, times: string[] },
      time: string
    }> = [];

    // Filter movies based on rating
    const filteredMovies = movies.filter(m => {
      const isVisible = isMovieVisible(m.title);
      const isFamilyFriendly = ['G', 'PG', 'PG-13'].includes(m.rating);
      return isVisible && (familyFriendlyOnly ? isFamilyFriendly : true);
    });

    // Create all possible intervals
    filteredMovies.forEach(movie => {
      const duration = getMovieDurationInMinutes(movie.duration);
      
      movie.screenings.forEach(screening => {
        screening.times.forEach(time => {
          const startTime = convertTo24Hour(time);
          const start = new Date(`${selectedDate}T${startTime}`);
          const end = new Date(start.getTime() + duration * 60000);
          
          intervals.push({ start, end, movie, screening, time });
        });
      });
    });

    // Sort intervals by start time to try to align movies across calendars
    intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Keep track of selected movies and last end time
    const selectedMovies = new Set<string>();
    let lastEndTime = new Date(`${selectedDate}T09:00:00`);

    intervals.forEach(interval => {
      if (selectedMovies.has(interval.movie.title)) return;
      
      const conflictsWithMeals = preferences.includeLunch && 
        interval.start <= new Date(`${selectedDate}T13:00:00`) && 
        interval.end >= new Date(`${selectedDate}T12:00:00`) ||
        preferences.includeDinner && 
        interval.start <= new Date(`${selectedDate}T18:30:00`) && 
        interval.end >= new Date(`${selectedDate}T17:30:00`);

      if (interval.start >= lastEndTime && !conflictsWithMeals) {
        newEvents.push({
          title: `${interval.movie.title} (${interval.screening.screen})`,
          start: interval.start.toISOString(),
          end: interval.end.toISOString(),
          backgroundColor: getMovieColor(interval.movie.rating),
          extendedProps: { movie: interval.movie }
        });
        
        selectedMovies.add(interval.movie.title);
        lastEndTime = interval.end;
      }
    });

    return newEvents;
  };

  // Rest of the component (UI, controls, etc.)
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
      <div 
        onClick={() => setIsCalendarVisible(!isCalendarVisible)}
        className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Comfortable Schedule</h3>
          <div className="text-gray-500">
            {isCalendarVisible ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="flex flex-wrap gap-4 items-center"
        >
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={preferences.includeLunch}
              onChange={e => setPreferences(p => ({ ...p, includeLunch: e.target.checked }))}
              className="rounded text-blue-600"
            />
            <span>Include Lunch Break</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={preferences.includeDinner}
              onChange={e => setPreferences(p => ({ ...p, includeDinner: e.target.checked }))}
              className="rounded text-blue-600"
            />
            <span>Include Dinner Break</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={preferences.pushRatedR}
              onChange={e => setPreferences(p => ({ ...p, pushRatedR: e.target.checked }))}
              className="rounded text-blue-600"
            />
            <span>Push R-Rated Movies Later</span>
          </label>
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