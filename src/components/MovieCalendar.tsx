
import FullCalendar from '@fullcalendar/react';
// import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Movie } from '../types/movie';
import { EventContentArg } from '@fullcalendar/core';
import { useEffect, useRef } from 'react';

type MovieCalendarProps = {
  selectedDate: string;
  movies: Movie[];
};

export default function MovieCalendar({ selectedDate, movies }: MovieCalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null);

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(selectedDate);
    }
  }, [selectedDate]);

  // Convert movie screenings to calendar events
  const events = movies.flatMap(movie => 
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
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
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