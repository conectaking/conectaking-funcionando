/**
 * Service: configuração do link preview e geração da imagem OG.
 */
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const repository = require('./personalizarLink.repository');

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 630;
const DEFAULT_LOGO_PATH = path.join(__dirname, '../../public_html/logo.png');

const DEFAULTS = {
    title: 'CONECTAKING',
    subtitle: 'Sua Presença Digital. Um Toque. Poder Absoluto.',
    bg_color_1: '#991B1B',
    bg_color_2: '#000000',
    text_color: '#F5F5F5',
    subtitle_color: '#FFC700',
};

async function getLinkPreviewConfig() {
    const config = await repository.getActiveConfig();
    if (config) return { success: true, config };
    return { success: true, config: DEFAULTS };
}

async function saveLinkPreviewConfig(body) {
    const db = require('../../db');
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        await repository.deactivateAll(client);
        const config = await repository.insertConfig(client, {
            title: body.title ?? DEFAULTS.title,
            subtitle: body.subtitle ?? DEFAULTS.subtitle,
            bg_color_1: body.bg_color_1 ?? DEFAULTS.bg_color_1,
            bg_color_2: body.bg_color_2 ?? DEFAULTS.bg_color_2,
            text_color: body.text_color ?? DEFAULTS.text_color,
            subtitle_color: body.subtitle_color ?? DEFAULTS.subtitle_color,
        });
        await client.query('COMMIT');
        return { config };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function generateOgImageBuffer(logoPath = DEFAULT_LOGO_PATH) {
    const customConfig = await repository.getActiveConfig();
    const title = customConfig?.title ?? DEFAULTS.title;
    const subtitle = customConfig?.subtitle ?? DEFAULTS.subtitle;
    const bgColor1 = customConfig?.bg_color_1 ?? DEFAULTS.bg_color_1;
    const bgColor2 = customConfig?.bg_color_2 ?? DEFAULTS.bg_color_2;
    const textColor = customConfig?.text_color ?? DEFAULTS.text_color;
    const subtitleColor = customConfig?.subtitle_color ?? DEFAULTS.subtitle_color;

    let logoBuffer = null;
    try {
        logoBuffer = await fs.readFile(logoPath);
    } catch (_) {
        // sem logo
    }

    const gradientSvg = `
        <svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:${bgColor1};stop-opacity:1" />
                    <stop offset="50%" style="stop-color:${bgColor2};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${bgColor1};stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" fill="url(#grad)"/>
        </svg>
    `;
    let image = sharp(Buffer.from(gradientSvg)).resize(OUTPUT_WIDTH, OUTPUT_HEIGHT);

    if (logoBuffer) {
        try {
            const logoResized = await sharp(logoBuffer)
                .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .toBuffer();
            image = image.composite([{ input: logoResized, left: 120, top: 200 }]);
        } catch (_) {}
    }

    const textX = logoBuffer ? 350 : OUTPUT_WIDTH / 2;
    const textAnchor = logoBuffer ? 'start' : 'middle';
    const textSvg = `
        <svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                <filter id="shadow">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.5"/>
                </filter>
            </defs>
            <text x="${textX}" y="${OUTPUT_HEIGHT / 2 + 20}" font-family="Arial, 'Helvetica Neue', sans-serif" font-size="100" font-weight="900" fill="${textColor}" text-anchor="${textAnchor}" filter="url(#glow) url(#shadow)" letter-spacing="2">${title}</text>
            <text x="${textX}" y="${OUTPUT_HEIGHT / 2 + 140}" font-family="Arial, 'Helvetica Neue', sans-serif" font-size="38" fill="${subtitleColor}" text-anchor="${textAnchor}" font-weight="600" letter-spacing="1">${subtitle}</text>
        </svg>
    `;
    const textBuffer = Buffer.from(textSvg);
    image = image.composite([{ input: textBuffer, blend: 'over' }]);
    return image.jpeg({ quality: 95 }).toBuffer();
}

function getFallbackOgImageBuffer() {
    const fallbackSvg = `
        <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
            <rect width="1200" height="630" fill="#991B1B"/>
            <text x="600" y="315" font-family="Arial" font-size="80" font-weight="bold" fill="#F5F5F5" text-anchor="middle">CONECTAKING</text>
        </svg>
    `;
    return sharp(Buffer.from(fallbackSvg)).jpeg({ quality: 90 }).toBuffer();
}

module.exports = {
    getLinkPreviewConfig,
    saveLinkPreviewConfig,
    generateOgImageBuffer,
    getFallbackOgImageBuffer,
};
