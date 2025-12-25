/**
 * Extrai o ID do vídeo do YouTube de diferentes formatos de URL
 * @param {string} url - URL do YouTube
 * @returns {string|null} - ID do vídeo ou null
 */
function extractYouTubeVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
        /youtu\.be\/([^?\n#]+)/,
        /youtube\.com\/shorts\/([^?\n#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

/**
 * Converte URL do YouTube para formato de embed
 * @param {string} url - URL do YouTube em qualquer formato
 * @returns {string} - URL no formato de embed
 */
function convertYouTubeUrlToEmbed(url) {
    if (!url || typeof url !== 'string') return '';
    
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return url; // Retorna a URL original se não conseguir extrair o ID
    
    // Remove parâmetros de timestamp e outros da URL
    const cleanVideoId = videoId.split('&')[0].split('?')[0].split('#')[0];
    
    return `https://www.youtube.com/embed/${cleanVideoId}`;
}

module.exports = { extractYouTubeVideoId, convertYouTubeUrlToEmbed };
