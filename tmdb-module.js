/*
 * TMDB (The Movie Database) API module for Movian
 * ECMAScript implementation
 */

// TMDB API configuration
const TMDB_CONFIG = {
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p/',
    apiKey: null, // Should be set by user
    language: 'en-US',
    
    // Image sizes
    posterSizes: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
    backdropSizes: ['w300', 'w780', 'w1280', 'original'],
    profileSizes: ['w45', 'w185', 'h632', 'original']
};

/**
 * HTTP request helper
 */
function makeRequest(url, options) {
    options = options || {};
    var response;
    try {
        response = require('movian/http').request(url, {
            method: options.method || 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Movian TMDB Module'
                // additional headers can be added here
            },
            timeout: options.timeout || 30000
        });
        console.log(response)

        if (response.statusCode !== 200) {
            throw new Error('HTTP ' + response.statusCode + ': ' + response.statusMessage);
        }

        return JSON.parse(response.body);
    } catch (error) {
        console.error('TMDB API request failed:', error);
        throw error;
    }
}

/**
 * Build API URL with parameters
 */
// function buildUrl(endpoint, params = {}) {
//     if (!TMDB_CONFIG.apiKey) {
//         throw new Error('TMDB API key not configured');
//     }
    
//     const url = new URL(endpoint, TMDB_CONFIG.baseUrl);
    
//     // Add API key and default parameters
//     url.searchParams.set('api_key', TMDB_CONFIG.apiKey);
//     url.searchParams.set('language', TMDB_CONFIG.language);
    
//     // Add custom parameters
//     Object.entries(params).forEach(([key, value]) => {
//         if (value !== undefined && value !== null) {
//             url.searchParams.set(key, value);
//         }
//     });
    
//     return url.toString();
// }

function buildUrl(endpoint, params) {
    if (!TMDB_CONFIG.apiKey) {
        throw new Error('TMDB API key not configured');
    }

    // Собираем параметры
    var query = {
        api_key: TMDB_CONFIG.apiKey,
        language: TMDB_CONFIG.language
    };

    for (var key in params) {
        if (params[key] !== undefined && params[key] !== null) {
            query[key] = params[key];
        }
    }

    // Объект URL для форматирования
    var urlObj = {
        protocol: 'https',
        hostname: TMDB_CONFIG.baseUrl.replace(/^https?:\/\//, ''),
        pathname: endpoint[0] === '/' ? endpoint : '/' + endpoint,
        query: query
    };

    return require('url').format(urlObj);
}

/**
 * Get image URL for different sizes
 */
function getImageUrl(path, size, type) {
    if (!path) return null;

    size = size || 'original';
    type = type || 'poster';

    var validSizes;
    switch (type) {
        case 'backdrop':
            validSizes = TMDB_CONFIG.backdropSizes;
            break;
        case 'profile':
            validSizes = TMDB_CONFIG.profileSizes;
            break;
        default:
            validSizes = TMDB_CONFIG.posterSizes;
    }

    if (validSizes.indexOf(size) === -1) {
        size = 'original';
    }

    return TMDB_CONFIG.imageBaseUrl + size + path;
}

/**
 * TMDB API Methods
 */
const TMDB = {
    
    /**
     * Configure the module
     */
    configure: function(config) {
        Object.assign(TMDB_CONFIG, config);
    },
    
    /**
     * Search for movies
     */
    searchMovies: function(query, options = {}) {
        const url = buildUrl('/search/movie', {
            query: query,
            page: options.page || 1,
            include_adult: options.includeAdult || false,
            region: options.region,
            year: options.year,
            primary_release_year: options.primaryReleaseYear
        });
        
        return makeRequest(url);
    },
    
    /**
     * Search for TV shows
     */
    searchTv: function(query, options = {}) {
        const url = buildUrl('/search/tv', {
            query: query,
            page: options.page || 1,
            include_adult: options.includeAdult || false,
            first_air_date_year: options.firstAirDateYear
        });
        
        return makeRequest(url);
    },
    
    /**
     * Search for people
     */
    searchPeople: function(query, options = {}) {
        const url = buildUrl('/search/person', {
            query: query,
            page: options.page || 1,
            include_adult: options.includeAdult || false,
            region: options.region
        });
        
        return makeRequest(url);
    },
    
    /**
     * Multi search (movies, TV shows, people)
     */
    multiSearch: function(query, options = {}) {
        const url = buildUrl('/search/multi', {
            query: query,
            page: options.page || 1,
            include_adult: options.includeAdult || false,
            region: options.region
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get movie details
     */
    getMovie: function(movieId, options = {}) {
        const url = buildUrl(`/movie/${movieId}`, {
            append_to_response: options.appendToResponse
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get TV show details
     */
    getTvShow: function(tvId, options = {}) {
        const url = buildUrl(`/tv/${tvId}`, {
            append_to_response: options.appendToResponse
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get person details
     */
    getPerson: function(personId, options = {}) {
        const url = buildUrl(`/person/${personId}`, {
            append_to_response: options.appendToResponse
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get movie credits
     */
    getMovieCredits: function(movieId) {
        const url = buildUrl(`/movie/${movieId}/credits`);
        return makeRequest(url);
    },
    
    /**
     * Get TV show credits
     */
    getTvCredits: function(tvId) {
        const url = buildUrl(`/tv/${tvId}/credits`);
        return makeRequest(url);
    },
    
    /**
     * Get person movie credits
     */
    getPersonMovieCredits: function(personId) {
        const url = buildUrl(`/person/${personId}/movie_credits`);
        return makeRequest(url);
    },
    
    /**
     * Get person TV credits
     */
    getPersonTvCredits: function(personId) {
        const url = buildUrl(`/person/${personId}/tv_credits`);
        return makeRequest(url);
    },
    
    /**
     * Get popular movies
     */
    getPopularMovies: function(options = {}) {
        const url = buildUrl('/movie/popular', {
            page: options.page || 1,
            region: options.region
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get top rated movies
     */
    getTopRatedMovies: function(options = {}) {
        const url = buildUrl('/movie/top_rated', {
            page: options.page || 1,
            region: options.region
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get upcoming movies
     */
    getUpcomingMovies: function(options = {}) {
        const url = buildUrl('/movie/upcoming', {
            page: options.page || 1,
            region: options.region
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get now playing movies
     */
    getNowPlayingMovies: function(options = {}) {
        const url = buildUrl('/movie/now_playing', {
            page: options.page || 1,
            region: options.region
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get popular TV shows
     */
    getPopularTvShows: function(options = {}) {
        const url = buildUrl('/tv/popular', {
            page: options.page || 1
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get top rated TV shows
     */
    getTopRatedTvShows: function(options = {}) {
        const url = buildUrl('/tv/top_rated', {
            page: options.page || 1
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get TV show season details
     */
    getTvSeason: function(tvId, seasonNumber, options = {}) {
        const url = buildUrl(`/tv/${tvId}/season/${seasonNumber}`, {
            append_to_response: options.appendToResponse
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get TV show episode details
     */
    getTvEpisode: function(tvId, seasonNumber, episodeNumber, options = {}) {
        const url = buildUrl(`/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`, {
            append_to_response: options.appendToResponse
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get movie recommendations
     */
    getMovieRecommendations: function(movieId, options = {}) {
        const url = buildUrl(`/movie/${movieId}/recommendations`, {
            page: options.page || 1
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get TV show recommendations
     */
    getTvRecommendations: function(tvId, options = {}) {
        const url = buildUrl(`/tv/${tvId}/recommendations`, {
            page: options.page || 1
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get similar movies
     */
    getSimilarMovies: function(movieId, options = {}) {
        const url = buildUrl(`/movie/${movieId}/similar`, {
            page: options.page || 1
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get similar TV shows
     */
    getSimilarTvShows: function(tvId, options = {}) {
        const url = buildUrl(`/tv/${tvId}/similar`, {
            page: options.page || 1
        });
        
        return makeRequest(url);
    },
    
    /**
     * Get movie videos
     */
    getMovieVideos: function(movieId) {
        const url = buildUrl(`/movie/${movieId}/videos`);
        return makeRequest(url);
    },
    
    /**
     * Get TV show videos
     */
    getTvVideos: function(tvId) {
        const url = buildUrl(`/tv/${tvId}/videos`);
        return makeRequest(url);
    },
    
    /**
     * Get movie images
     */
    getMovieImages: function(movieId) {
        const url = buildUrl(`/movie/${movieId}/images`);
        return makeRequest(url);
    },
    
    /**
     * Get TV show images
     */
    getTvImages: function(tvId) {
        const url = buildUrl(`/tv/${tvId}/images`);
        return makeRequest(url);
    },
    
    /**
     * Get genres list
     */
    getMovieGenres: function() {
        const url = buildUrl('/genre/movie/list');
        return makeRequest(url);
    },
    
    getTvGenres: function() {
        const url = buildUrl('/genre/tv/list');
        return makeRequest(url);
    },
    
    /**
     * Discover movies
     */
    discoverMovies: function(options = {}) {
        const url = buildUrl('/discover/movie', {
            page: options.page || 1,
            sort_by: options.sortBy || 'popularity.desc',
            'primary_release_date.gte': options.primaryReleaseDateGte,
            'primary_release_date.lte': options.primaryReleaseDateLte,
            'release_date.gte': options.releaseDateGte,
            'release_date.lte': options.releaseDateLte,
            'vote_average.gte': options.voteAverageGte,
            'vote_average.lte': options.voteAverageLte,
            'vote_count.gte': options.voteCountGte,
            'vote_count.lte': options.voteCountLte,
            with_genres: options.withGenres,
            without_genres: options.withoutGenres,
            with_companies: options.withCompanies,
            with_people: options.withPeople,
            with_cast: options.withCast,
            with_crew: options.withCrew,
            year: options.year,
            primary_release_year: options.primaryReleaseYear
        });
        
        return makeRequest(url);
    },
    
    /**
     * Discover TV shows
     */
    discoverTvShows: function(options = {}) {
        const url = buildUrl('/discover/tv', {
            page: options.page || 1,
            sort_by: options.sortBy || 'popularity.desc',
            'first_air_date.gte': options.firstAirDateGte,
            'first_air_date.lte': options.firstAirDateLte,
            'vote_average.gte': options.voteAverageGte,
            'vote_average.lte': options.voteAverageLte,
            'vote_count.gte': options.voteCountGte,
            'vote_count.lte': options.voteCountLte,
            with_genres: options.withGenres,
            without_genres: options.withoutGenres,
            with_companies: options.withCompanies,
            with_networks: options.withNetworks,
            first_air_date_year: options.firstAirDateYear
        });
        
        return makeRequest(url);
    },
    
    /**
     * Helper methods for common operations
     */
    
    /**
     * Get full image URLs for a movie/TV show
     */
    getImageUrls: function(item, type = 'movie') {
        const result = {};
        
        if (item.poster_path) {
            result.poster = {
                small: getImageUrl(item.poster_path, 'w185', 'poster'),
                medium: getImageUrl(item.poster_path, 'w342', 'poster'),
                large: getImageUrl(item.poster_path, 'w500', 'poster'),
                original: getImageUrl(item.poster_path, 'original', 'poster')
            };
        }
        
        if (item.backdrop_path) {
            result.backdrop = {
                small: getImageUrl(item.backdrop_path, 'w300', 'backdrop'),
                medium: getImageUrl(item.backdrop_path, 'w780', 'backdrop'),
                large: getImageUrl(item.backdrop_path, 'w1280', 'backdrop'),
                original: getImageUrl(item.backdrop_path, 'original', 'backdrop')
            };
        }
        
        if (item.profile_path) {
            result.profile = {
                small: getImageUrl(item.profile_path, 'w45', 'profile'),
                medium: getImageUrl(item.profile_path, 'w185', 'profile'),
                large: getImageUrl(item.profile_path, 'h632', 'profile'),
                original: getImageUrl(item.profile_path, 'original', 'profile')
            };
        }
        
        return result;
    },
    
    /**
     * Format movie/TV show data for Movian
     */
    formatForMovian: function(item, type = 'movie') {
        const formatted = {
            id: item.id,
            title: item.title || item.name,
            originalTitle: item.original_title || item.original_name,
            overview: item.overview,
            releaseDate: item.release_date || item.first_air_date,
            rating: item.vote_average,
            voteCount: item.vote_count,
            popularity: item.popularity,
            adult: item.adult,
            genres: item.genres || [],
            images: this.getImageUrls(item, type)
        };
        
        if (type === 'movie') {
            formatted.runtime = item.runtime;
            formatted.budget = item.budget;
            formatted.revenue = item.revenue;
            formatted.imdbId = item.imdb_id;
        } else if (type === 'tv') {
            formatted.numberOfSeasons = item.number_of_seasons;
            formatted.numberOfEpisodes = item.number_of_episodes;
            formatted.lastAirDate = item.last_air_date;
            formatted.status = item.status;
            formatted.networks = item.networks || [];
            formatted.createdBy = item.created_by || [];
        }
        
        return formatted;
    }
};

// Export the module
module.exports = TMDB;