import FullCalendar from '@fullcalendar/react';
// import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Movie } from '../types/movie';
import { EventContentArg } from '@fullcalendar/core';
import { useEffect, useRef, useState } from 'react';
import { useMovieVisibility } from '../contexts/MovieVisibilityContext';

type MovieCalendarProps = {
  selectedDate: string;
  movies: Movie[];
};

export default function MovieCalendar({ selectedDate, movies }: MovieCalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);
  const { isMovieVisible } = useMovieVisibility();

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(selectedDate);
    }
  }, [selectedDate]);

  // Convert movie screenings to calendar events
  const events = movies
    .filter(movie => isMovieVisible(movie.title))
    .flatMap(movie => 
      movie.screenings.flatMap(screening =>
        screening.times.map(time => {
          const [hours, minutes] = time.replace(/\s*(AM|PM)\s*$/i, '').split(':');
          const isPM = time.toLowerCase().includes('pm');
          
          let hour = parseInt(hours);
          if (isPM && hour !== 12) hour += 12;
          if (!isPM && hour === 12) hour = 0;

          // Create date object from selectedDate string (YYYY-MM-DD)
          const [year, month, day] = selectedDate.split('-').map(Number);
          const date = new Date(year, month - 1, day); // month is 0-based in JS
          date.setHours(hour, parseInt(minutes), 0);

          // Calculate end time (movie duration + 30 min for credits/cleanup)
          const endDate = new Date(date);
          const [durationHours, durationMinutes] = movie.duration
            .match(/(\d+)\s*hours?,\s*(\d+)\s*minutes?/i)
            ?.slice(1)
            .map(Number) || [2, 0];
          
          endDate.setHours(
            endDate.getHours() + durationHours,
            endDate.getMinutes() + durationMinutes + 30
          );

          return {
            title: `${movie.title} (${screening.screen})`,
            start: date,
            end: endDate,
            extendedProps: {
              movie,
              screening
            },
            backgroundColor: getMovieColor(movie.rating),
          };
        })
      )
    );

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
      <button 
        onClick={() => setIsCalendarVisible(!isCalendarVisible)}
        className="w-full px-6 py-4 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <h2 className="text-lg font-semibold text-gray-800">Daily Schedule</h2>
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
          events={events}
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