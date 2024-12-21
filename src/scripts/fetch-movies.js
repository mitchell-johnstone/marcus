import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function fetchMovieData() {
	const movieData = {};
	const baseUrl = 'https://www.marcustheatres.com/theatre-locations/north-shore-cinema-mequon';

	console.log('Launching browser...');
	const browser = await chromium.launch({
		args: ['--no-sandbox'] // Required for running in GitHub Actions
	});
	const context = await browser.newContext();
	const page = await context.newPage();

	// Set default timeout
	page.setDefaultTimeout(5000); // 5 seconds

	const today = new Date();

	for (let i = 0; i < 15; i++) {
		let date = new Date(today);
		date.setDate(date.getDate() + i);
		const dateString = date.toISOString().split('T')[0];
		
		console.log(`Fetching data for ${dateString}...`);
		
		try {
			// Navigate to page and wait for network idle
			await page.goto(`${baseUrl}?Date=${dateString}`, {
				waitUntil: 'networkidle'
			});
			
			// Wait for either movie showtimes or "no movies" message
			try {
				await Promise.race([
					page.waitForSelector('.movie-showtimes', { timeout: 5000 }),
					page.waitForSelector('.no-movies-message', { timeout: 5000 })
				]);
			} catch (error) {
				console.log(`Timeout waiting for movie data on ${dateString}. Skipping...`);
				continue;
			}

			// Check if there are any movies
			const hasMovies = await page.locator('.movie-showtimes').count() > 0;
			
			if (!hasMovies) {
				console.log(`No movies found for ${dateString}`);
				movieData[dateString] = [];
				continue;
			}

			movieData[dateString] = await page.evaluate(() => {
				const movies = [];
				document.querySelectorAll('.movie-showtimes').forEach((element) => {
					// get movie details
					const movieDetails = element.querySelector('.movie-showtimes__info--details');
					const rating = movieDetails?.querySelector('.rating-link')?.textContent?.trim() || '';
					const detailsText = movieDetails?.textContent?.trim() || '';
					const duration = detailsText.match(/(\d+)\s*hours?,\s*(\d+)\s*minutes/)?.[0] || '';
					const genres = detailsText.split('|')[2]?.trim() || '';

					// Get screenings data
					const screenings = [];
					element.querySelectorAll('.movie-showtimes__screen-type').forEach((screenType) => {
						const screenTypeElement = screenType.querySelector('.screen-type__text');
						const screenName =
							screenTypeElement?.querySelector('strong')?.textContent?.trim() ||
							screenTypeElement?.querySelector('img')?.getAttribute('alt')?.trim() ||
							'';
						const showtimes = Array.from(
							screenType.querySelectorAll('.movie-showtime--a, .matinee')
						)
							.map((showtime) => showtime.textContent.trim())
							.filter(Boolean);

						if (screenName && showtimes.length > 0) {
							screenings.push({
								screen: screenName,
								times: showtimes
							});
						}
					});

					const movie = {
						title: element.querySelector('.movie-title')?.textContent?.trim() || '',
						poster:
							element.querySelector('.movie-info__poster-img')?.getAttribute('data-src') || '',
						rating: rating,
						duration: duration,
						genres: genres,
						screenings: screenings
					};
					movies.push(movie);
				});
				return movies;
			});
			
			console.log(`Successfully fetched ${movieData[dateString].length} movies for ${dateString}`);
			
			// Add a small delay between requests to avoid overwhelming the server
			await page.waitForTimeout(500);

		} catch (error) {
			console.error(`Error fetching data for ${dateString}:`, error);
			movieData[dateString] = [];
		}
	}

	await browser.close();
	console.log('Browser closed. Writing data to file...');

	fs.writeFileSync(
		path.join(process.cwd(), 'src/lib/movie-data.json'),
		JSON.stringify(movieData, null, 2)
	);
	
	console.log('Data written successfully!');
}

fetchMovieData().catch(error => {
	console.error('Fatal error:', error);
	process.exit(1);
});
