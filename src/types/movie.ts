export interface Screening {
  screen: string;
  times: string[];
}

export interface Movie {
  title: string;
  poster: string;
  rating: string;
  duration: string;
  genres: string;
  screenings: Screening[];
}

export interface MovieDatabase {
  [date: string]: Movie[];
}