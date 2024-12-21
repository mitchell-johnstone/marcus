import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function fetchMovieData() {
	const movieData = {};
	const baseUrl = 'https://www.marcustheatres.com/theatre-locations/north-shore-cinema-mequon';

	console.log('Launching browser...');
	const browser = await chromium.launch({
		headless: true,
		chromiumSandbox: false // Required for running in GitHub Actions
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1280, height: 720 },
			userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
		});
		const page = await context.newPage();

		// Set shorter timeout for element selectors
		page.setDefaultTimeout(5000);

		const today = new Date();

		for (let i = 0; i < 15; i++) {
			let date = new Date(today);
			date.setDate(date.getDate() + i);
			const dateString = date.toISOString().split('T')[0];
			
			console.log(`Fetching data for ${dateString}...`);
			
			try {
				await page.goto(`${baseUrl}?Date=${dateString}`, {
					waitUntil: 'networkidle',
					timeout: 30000
				});
				
				// Wait for either movie showtimes or "no movies" message
				const hasContent = await Promise.race([
					page.waitForSelector('.movie-showtimes', { timeout: 5000 })
						.then(() => true)
						.catch(() => false),
					page.waitForSelector('.no-movies-message', { timeout: 5000 })
						.then(() => true)
						.catch(() => false)
				]);

				if (!hasContent) {
					console.log(`No content found for ${dateString}`);
					movieData[dateString] = [];
					continue;
				}

				// Check if there are any movies
				const hasMovies = await page.locator('.movie-showtimes').count() > 0;
				
				if (!hasMovies) {
					console.log(`No movies found for ${dateString}`);
					movieData[dateString] = [];
					continue;
				}

				const movies = await page.evaluate(() => {
					const movies = [];
					document.querySelectorAll('.movie-showtimes').forEach((element) => {
						const movieDetails = element.querySelector('.movie-showtimes__info--details');
						const rating = movieDetails?.querySelector('.rating-link')?.textContent?.trim() || '';
						const detailsText = movieDetails?.textContent?.trim() || '';
						const duration = detailsText.match(/(\d+)\s*hours?,\s*(\d+)\s*minutes/)?.[0] || '';
						const genres = detailsText.split('|')[2]?.trim() || '';

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

						movies.push({
							title: element.querySelector('.movie-title')?.textContent?.trim() || '',
							poster: element.querySelector('.movie-info__poster-img')?.getAttribute('data-src') || '',
							rating,
							duration,
							genres,
							screenings
						});
					});
					return movies;
				});

				movieData[dateString] = movies;
				console.log(`Successfully fetched ${movies.length} movies for ${dateString}`);
				
				// Add a small delay between requests
				await page.waitForTimeout(1000);

			} catch (error) {
				console.error(`Error fetching data for ${dateString}:`, error);
				movieData[dateString] = [];
			}
		}

	} finally {
		await browser.close();
		console.log('Browser closed. Writing data to file...');
	}

	const outputDir = path.join(process.cwd(), 'src/lib');
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	fs.writeFileSync(
		path.join(outputDir, 'movie-data.json'),
		JSON.stringify(movieData, null, 2)
	);
	
	console.log('Data written successfully!');
}

fetchMovieData().catch(console.error);
