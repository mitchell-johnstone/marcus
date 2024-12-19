import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Movie } from '../types/movie';
import { EventContentArg } from '@fullcalendar/core';
import { useEffect, useRef, useState } from 'react';

type OptimizedMovieCalendarProps = {
  selectedDate: string;
  movies: Movie[];
};

export default function OptimizedMovieCalendar({ selectedDate, movies }: OptimizedMovieCalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(selectedDate);
    }
  }, [selectedDate]);

  // Function to calculate movie duration in minutes
  const getMovieDurationInMinutes = (duration: string): number => {
    const match = duration.match(/(\d+)\s*hours?,\s*(\d+)\s*minutes?/i);
    if (!match) return 120; // default 2 hours if format doesn't match
    const [, hours, minutes] = match;
    return parseInt(hours) * 60 + parseInt(minutes);
  };

  // Function to optimize movie schedule
  const optimizeSchedule = () => {
    const allScreenings = movies.flatMap(movie => 
      movie.screenings.flatMap(screening =>
        screening.times.map(time => ({
          movie,
          screening,
          time,
          duration: getMovieDurationInMinutes(movie.duration)
        }))
      )
    );

    // Sort screenings by start time
    allScreenings.sort((a, b) => {
      const timeA = new Date(`${selectedDate}T${convertTo24Hour(a.time)}`);
      const timeB = new Date(`${selectedDate}T${convertTo24Hour(b.time)}`);
      return timeA.getTime() - timeB.getTime();
    });

    // Find non-overlapping schedule
    const optimizedSchedule = [];
    let lastEndTime: Date | null = null;
    const seenMovies = new Set<string>(); // Track movies we've already scheduled

    for (const screening of allScreenings) {
      // Skip if we've already scheduled this movie
      if (seenMovies.has(screening.movie.title)) continue;

      const startTime = new Date(`${selectedDate}T${convertTo24Hour(screening.time)}`);
      const endTime = new Date(startTime.getTime());
      endTime.setMinutes(endTime.getMinutes() + screening.duration + 30); // Add 30 minutes buffer

      if (!lastEndTime || startTime >= lastEndTime) {
        optimizedSchedule.push({
          title: `${screening.movie.title} (${screening.screening.screen})`,
          start: startTime,
          end: endTime,
          extendedProps: {
            movie: screening.movie,
            screening: screening.screening
          },
          backgroundColor: getMovieColor(screening.movie.rating),
        });
        lastEndTime = endTime;
        seenMovies.add(screening.movie.title); // Mark this movie as scheduled
      }
    }

    return optimizedSchedule;
  };

  // Helper function to convert 12-hour time to 24-hour format
  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(/\s*(AM|PM)/i);
    let [hours, minutes] = time.split(':');
    
    let hour = parseInt(hours, 10);
    if (modifier?.toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (modifier?.toLowerCase() === 'am' && hour === 12) hour = 0;
    
    return `${hour.toString().padStart(2, '0')}:${minutes}:00`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
      <button 
        onClick={() => setIsCalendarVisible(!isCalendarVisible)}
        className="w-full px-6 py-4 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <h2 className="text-lg font-semibold text-gray-800">Optimized Schedule</h2>
        <svg 
          className={`w-5 h-5 transform transition-transform ${isCalendarVisible ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div className={`transition-all duration-300 ${isCalendarVisible ? 'p-6' : 'h-0 p-0 overflow-hidden'}`}>
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin]}
          initialView="timeGridDay"
          initialDate={selectedDate}
          headerToolbar={false}
          slotMinTime="09:00:00"
          slotMaxTime="24:00:00"
          height="auto"
          allDaySlot={false}
          events={optimizeSchedule()}
          eventContent={renderEventContent}
          slotDuration="00:30:00"
        />
      </div>
    </div>
  );
}

function renderEventContent(eventInfo: EventContentArg) {
  const { movie } = eventInfo.event.extendedProps as { movie: Movie };
  return (
    <div className="p-1 text-xs">
      <div className="font-bold truncate">{eventInfo.event.title}</div>
      <div className="text-gray-600">{movie.rating} • {eventInfo.timeText}</div>
    </div>
  );
}

function getMovieColor(rating: string): string {
  switch (rating) {
    case 'G':
      return '#4ade80'; // green
    case 'PG':
      return '#60a5fa'; // blue
    case 'PG13':
      return '#f59e0b'; // amber
    case 'R':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
} 