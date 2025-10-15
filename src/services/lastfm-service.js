/**
 * Last.fm API Service
 * Fetches album artwork and track information
 */

const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY;
const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/';

// Simple in-memory cache to avoid repeated API calls
const albumArtCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

class LastFmService {
  /**
   * Get album artwork for a track
   * @param {string} artist - Artist name
   * @param {string} track - Track name
   * @param {string} album - Album name (optional)
   * @returns {Promise<string|null>} - URL of the smallest album art image, or null if not found
   */
  async getAlbumArt(artist, track, album = null) {
    // Check if API key is configured
    if (!LASTFM_API_KEY || LASTFM_API_KEY === 'your_lastfm_api_key_here') {
      console.debug('[Last.fm] API key not configured');
      return null;
    }

    // Validate inputs
    if (!artist || !track || artist === 'Unknown' || track === 'Unknown' || track === 'No Track Playing') {
      return null;
    }

    // Create cache key
    const cacheKey = `${artist.toLowerCase()}-${track.toLowerCase()}`;
    
    // Check cache first
    const cached = albumArtCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.debug('[Last.fm] Returning cached album art');
      return cached.url;
    }

    try {
      // Try getting track info first (more accurate)
      const trackUrl = this.buildTrackInfoUrl(artist, track);
      const trackResponse = await fetch(trackUrl);
      
      if (trackResponse.ok) {
        const trackData = await trackResponse.json();
        const imageUrl = this.extractSmallestImage(trackData?.track?.album?.image);
        
        if (imageUrl) {
          // Cache the result
          albumArtCache.set(cacheKey, {
            url: imageUrl,
            timestamp: Date.now()
          });
          return imageUrl;
        }
      }

      // Fallback to album search if we have album name
      if (album && album !== 'Unknown' && album !== 'Unknown Album') {
        const albumUrl = this.buildAlbumInfoUrl(artist, album);
        const albumResponse = await fetch(albumUrl);
        
        if (albumResponse.ok) {
          const albumData = await albumResponse.json();
          const imageUrl = this.extractSmallestImage(albumData?.album?.image);
          
          if (imageUrl) {
            // Cache the result
            albumArtCache.set(cacheKey, {
              url: imageUrl,
              timestamp: Date.now()
            });
            return imageUrl;
          }
        }
      }

      // Cache null result to avoid repeated failed requests
      albumArtCache.set(cacheKey, {
        url: null,
        timestamp: Date.now()
      });
      
      return null;
    } catch (error) {
      console.error('[Last.fm] Failed to fetch album art:', error);
      return null;
    }
  }

  /**
   * Build URL for track.getInfo endpoint
   */
  buildTrackInfoUrl(artist, track) {
    const params = new URLSearchParams({
      method: 'track.getInfo',
      api_key: LASTFM_API_KEY,
      artist: artist,
      track: track,
      format: 'json',
      autocorrect: 1 // Auto-correct artist/track names
    });
    return `${LASTFM_API_BASE}?${params.toString()}`;
  }

  /**
   * Build URL for album.getInfo endpoint
   */
  buildAlbumInfoUrl(artist, album) {
    const params = new URLSearchParams({
      method: 'album.getInfo',
      api_key: LASTFM_API_KEY,
      artist: artist,
      album: album,
      format: 'json',
      autocorrect: 1 // Auto-correct artist/album names
    });
    return `${LASTFM_API_BASE}?${params.toString()}`;
  }

  /**
   * Extract the smallest image URL from Last.fm image array
   * Last.fm provides: small (34x34), medium (64x64), large (174x174), extralarge (300x300), mega (600x600)
   * We'll use "small" size as requested
   */
  extractSmallestImage(images) {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return null;
    }

    // Try to find "small" size first
    const smallImage = images.find(img => img.size === 'small');
    if (smallImage && smallImage['#text']) {
      return smallImage['#text'];
    }

    // Fallback to first non-empty image
    const firstImage = images.find(img => img['#text'] && img['#text'].length > 0);
    return firstImage ? firstImage['#text'] : null;
  }

  /**
   * Clear the album art cache
   */
  clearCache() {
    albumArtCache.clear();
    console.log('[Last.fm] Cache cleared');
  }
}

// Export singleton instance
export const lastFmService = new LastFmService();
export default lastFmService;

