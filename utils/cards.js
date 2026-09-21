const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FONTS = path.join(__dirname, '..', 'assets', 'fonts');
const REGULAR = path.join(FONTS, 'JetBrainsMono-Regular.ttf');
const BOLD = path.join(FONTS, 'JetBrainsMono-Bold.ttf');

GlobalFonts.registerFromPath(REGULAR, 'EmeMono');
GlobalFonts.registerFromPath(BOLD, 'EmeMonoBold');

const M = size => `${size}px EmeMono, monospace`;
const B = size => `${size}px EmeMonoBold, EmeMono, monospace`;

const COLORS = {
    green: '#3ddd87',
    yellow: '#ffd23f',
    purple: '#a970ff',
    red: '#ff4d4d'
};

const BG = '#060907';
const PANEL = '#0d1310';
const WHITE = '#eef4ee';
const DIM = '#a9b4ad';
const GRAY = '#6f7d74';

function rgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function readGlyphs(file) {
    const b = fs.readFileSync(file);
    const glyphs = new Set();
    const tables = b.readUInt16BE(4);
    let cmap = 0;

    for (let i = 0; i < tables; i++) {
        if (b.toString('latin1', 12 + i * 16, 16 + i * 16) === 'cmap') {
            cmap = b.readUInt32BE(20 + i * 16);
        }
    }

    const count = b.readUInt16BE(cmap + 2);

    for (let i = 0; i < count; i++) {
        const sub = cmap + b.readUInt32BE(cmap + 8 + i * 8);
        const format = b.readUInt16BE(sub);

        if (format === 4) {
            const segs = b.readUInt16BE(sub + 6) / 2;
            const ends = sub + 14;
            const starts = ends + segs * 2 + 2;

            for (let s = 0; s < segs; s++) {
                const end = b.readUInt16BE(ends + s * 2);
                const start = b.readUInt16BE(starts + s * 2);

                for (let c = start; c <= end && c < 0xFFFF; c++) glyphs.add(c);
            }
        }

        if (format === 12) {
            const groups = b.readUInt32BE(sub + 12);

            for (let g = 0; g < groups; g++) {
                const start = b.readUInt32BE(sub + 16 + g * 12);
                const end = b.readUInt32BE(sub + 20 + g * 12);

                for (let c = start; c <= end; c++) glyphs.add(c);
            }
        }
    }

    return glyphs;
}

let GLYPHS = null;

try {
    GLYPHS = readGlyphs(REGULAR);
} catch (error) {
    console.warn('Could not read font glyphs:', error.message);
}

function clean(value, fallback = 'Unknown') {
    const text = [...String(value ?? '').normalize('NFKC').replace(/\s/g, ' ')]
        .filter(ch => GLYPHS
            ? GLYPHS.has(ch.codePointAt(0))
            : /[\p{L}\p{N}\p{P} ]/u.test(ch))
        .join('')
        .replace(/\s+/g, ' ')
        .trim();

    return text || fallback;
}

const num = value => Number(value || 0).toLocaleString('en-US');

async function load(src) {
    if (!src) return null;

    try {
        const data = /^https?:/.test(src)
            ? (await axios.get(src, { responseType: 'arraybuffer', timeout: 8000 })).data
            : src;

        return await loadImage(data);
    } catch (error) {
        console.warn(`Card image failed (${src}):`, error.message);
        return null;
    }
}

function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function text(ctx, value, x, y, font, color, align = 'left', glow = 0) {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';

    if (glow) {
        ctx.shadowColor = rgba(color, 0.65);
        ctx.shadowBlur = glow;
    }

    ctx.fillText(value, x, y);
    ctx.restore();
}

function fit(ctx, value, maxWidth, size, face = B, min = 16) {
    let s = String(value);
    let px = size;

    ctx.font = face(px);

    while (px > min && ctx.measureText(s).width > maxWidth) {
        px -= 2;
        ctx.font = face(px);
    }

    while (s.length > 1 && ctx.measureText(s).width > maxWidth) {
        s = s.slice(0, -2) + '…';
        ctx.font = face(px);
    }

    return { value: s, font: face(px) };
}

function base(w, h, c) {
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');

    rr(ctx, 0, 0, w, h, 20);
    ctx.clip();

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.95);
    g.addColorStop(0, rgba(c, 0.19));
    g.addColorStop(0.5, rgba(c, 0.09));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    g = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, w * 0.6);
    g.addColorStop(0, rgba(c, 0.06));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = rgba(c, 0.05);
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 40; x < w; x += 40) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
    }

    for (let y = 40; y < h; y += 40) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
    }

    ctx.stroke();

    ctx.strokeStyle = rgba(c, 0.4);
    ctx.lineWidth = 2;
    rr(ctx, 1, 1, w - 2, h - 2, 19);
    ctx.stroke();

    return { canvas, ctx };
}

function brand(ctx, w, c, y = 52, pad = 50) {
    const s = 20;
    const x = w - pad - s;

    text(ctx, 'EME GUILD', x - 14, y, M(17), c, 'right', 12);

    ctx.save();
    ctx.shadowColor = rgba(c, 0.6);
    ctx.shadowBlur = 12;
    ctx.fillStyle = c;
    rr(ctx, x, y - s / 2, s, s, 5);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = BG;
    ctx.fillRect(x + 4.5, y - s / 2 + 4.5, s - 9, s - 9);
}

function circle(ctx, img, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (img) {
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    } else {
        ctx.fillStyle = '#121a16';
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    ctx.restore();
}

function avatar(ctx, img, cx, cy, r, c, lw = 5) {
    ctx.save();
    ctx.shadowColor = rgba(c, 0.6);
    ctx.shadowBlur = 26;
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r + lw / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    circle(ctx, img, cx, cy, r);
}

function tile(ctx, img, x, y, size, c, pixelated = false) {
    ctx.save();
    ctx.shadowColor = rgba(c, 0.55);
    ctx.shadowBlur = 24;
    ctx.fillStyle = PANEL;
    rr(ctx, x, y, size, size, 16);
    ctx.fill();
    ctx.restore();

    ctx.save();
    rr(ctx, x, y, size, size, 16);
    ctx.clip();

    if (img) {
        ctx.imageSmoothingEnabled = !pixelated;
        ctx.drawImage(img, x, y, size, size);
    } else {
        ctx.fillStyle = rgba(c, 0.08);
        ctx.fillRect(x, y, size, size);
    }

    ctx.restore();

    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    rr(ctx, x + 1.5, y + 1.5, size - 3, size - 3, 15);
    ctx.stroke();
}

function bar(ctx, x, y, w, h, progress, c) {
    ctx.fillStyle = '#080c0a';
    rr(ctx, x, y, w, h, h / 2);
    ctx.fill();

    ctx.strokeStyle = rgba(c, 0.35);
    ctx.lineWidth = 2;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, h / 2 - 1);
    ctx.stroke();

    if (progress > 0) {
        const ih = h - 8;
        const fw = Math.max(ih, (w - 8) * Math.min(1, progress));
        const g = ctx.createLinearGradient(x, 0, x + w, 0);

        g.addColorStop(0, rgba(c, 0.75));
        g.addColorStop(1, c);

        ctx.save();
        ctx.shadowColor = rgba(c, 0.5);
        ctx.shadowBlur = 10;
        ctx.fillStyle = g;
        rr(ctx, x + 4, y + 4, fw, ih, ih / 2);
        ctx.fill();
        ctx.restore();
    }
}

const png = canvas => canvas.encode('png');

async function rankCard({ name, avatarURL, level, rank, xp, into, need }) {
    const c = COLORS.green;
    const { canvas, ctx } = base(1000, 230, c);
    const img = await load(avatarURL);

    brand(ctx, 1000, c, 40, 56);
    avatar(ctx, img, 118, 115, 68, c);

    text(ctx, '// RANK', 235, 40, M(16), c);

    const n = fit(ctx, clean(name), 700, 42, B, 26);
    text(ctx, n.value, 235, 80, n.font, WHITE);

    text(ctx, 'LEVEL', 235, 122, M(13), GRAY);
    text(ctx, 'RANK', 410, 122, M(13), GRAY);
    text(ctx, 'TOTAL XP', 585, 122, M(13), GRAY);

    text(ctx, num(level), 235, 148, M(28), c, 'left', 14);
    text(ctx, `#${num(rank)}`, 410, 148, M(28), WHITE);
    text(ctx, num(xp), 585, 148, M(28), WHITE);

    text(ctx, 'NEXT LEVEL', 235, 178, M(13), GRAY);
    text(ctx, `${num(into)} / ${num(need)} XP`, 950, 176, M(15), DIM, 'right');

    bar(ctx, 235, 189, 715, 22, into / Math.max(1, need), c);

    return png(canvas);
}

async function topCard(rows) {
    const c = COLORS.green;
    const { canvas, ctx } = base(1000, 634, c);
    const images = await Promise.all(
        Array.from({ length: 10 }, (_, i) => load(rows[i]?.avatarURL))
    );

    brand(ctx, 1000, c, 38, 48);

    text(ctx, '// LEADERBOARD', 40, 38, M(14), c);
    text(ctx, 'TOP 10', 40, 68, M(30), WHITE);

    for (let i = 0; i < 10; i++) {
        const row = rows[i];
        const y = 100 + i * 52;
        const cy = y + 23;
        const first = i === 0;

        ctx.fillStyle = first ? '#0f1c14' : PANEL;
        rr(ctx, 30, y, 940, 46, 12);
        ctx.fill();

        ctx.strokeStyle = rgba(c, first ? 0.45 : 0.16);
        ctx.lineWidth = 2;
        rr(ctx, 31, y + 1, 938, 44, 11);
        ctx.stroke();

        text(ctx, `#${i + 1}`, 76, cy, M(20), i < 3 ? c : GRAY, 'center', i < 3 ? 12 : 0);

        if (!row) {
            ctx.strokeStyle = rgba(c, 0.16);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(150, cy, 16, 0, Math.PI * 2);
            ctx.stroke();

            text(ctx, '—', 184, cy, B(18), GRAY);
            continue;
        }

        circle(ctx, images[i], 150, cy, 17);

        const n = fit(ctx, clean(row.name), 520, 18, B, 12);
        text(ctx, n.value, 184, cy, n.font, WHITE);

        text(ctx, `LVL ${num(row.level)}`, 800, cy, M(16), c, 'right');
        text(ctx, `${num(row.xp)} XP`, 944, cy, M(14), DIM, 'right');
    }

    return png(canvas);
}

async function welcomeCard({ name, avatarURL, members, created }) {
    const c = COLORS.yellow;
    const { canvas, ctx } = base(1000, 230, c);
    const img = await load(avatarURL);

    brand(ctx, 1000, c, 40, 56);
    avatar(ctx, img, 118, 115, 68, c);

    text(ctx, '// WELCOME', 235, 40, M(16), c);

    const n = fit(ctx, clean(name), 700, 42, B, 26);
    text(ctx, n.value, 235, 80, n.font, WHITE);

    text(ctx, 'MEMBERS', 235, 122, M(13), GRAY);
    text(ctx, 'ACCOUNT CREATED', 410, 122, M(13), GRAY);

    text(ctx, num(members), 235, 148, M(28), c, 'left', 14);
    text(ctx, created, 410, 148, M(28), WHITE);

    ctx.fillStyle = rgba(c, 0.06);
    rr(ctx, 235, 178, 715, 34, 17);
    ctx.fill();
    ctx.strokeStyle = rgba(c, 0.35);
    ctx.lineWidth = 2;
    rr(ctx, 236, 179, 713, 32, 16);
    ctx.stroke();

    text(ctx, 'Welcome to the EME Guild! Enjoy your stay.', 592, 195, M(16), c, 'center');

    return png(canvas);
}

async function levelUpCard({ name, avatarURL, level, into, need }) {
    const c = COLORS.purple;
    const { canvas, ctx } = base(1000, 230, c);
    const img = await load(avatarURL);

    brand(ctx, 1000, c, 40, 56);
    avatar(ctx, img, 118, 115, 68, c);

    text(ctx, '// LEVEL UP', 235, 40, M(16), c);

    const n = fit(ctx, clean(name), 700, 42, B, 26);
    text(ctx, n.value, 235, 80, n.font, WHITE);

    const lead = 'has advanced to level ';
    ctx.font = M(24);
    const width = ctx.measureText(lead).width;

    text(ctx, lead, 235, 132, M(24), DIM);
    text(ctx, num(level), 235 + width, 130, B(40), c, 'left', 18);

    text(ctx, 'NEXT LEVEL', 235, 178, M(13), GRAY);
    text(ctx, `${num(into)} / ${num(need)} XP`, 950, 176, M(15), DIM, 'right');

    bar(ctx, 235, 189, 715, 22, into / Math.max(1, need), c);

    return png(canvas);
}

async function memberCard({ nick, discordName, discordAvatarURL, removed = false }) {
    const c = removed ? COLORS.red : COLORS.green;
    const { canvas, ctx } = base(1000, 290, c);

    const [head, discord] = await Promise.all([
        load(`https://mc-heads.net/avatar/${encodeURIComponent(nick)}/110`),
        load(discordAvatarURL)
    ]);

    brand(ctx, 1000, c, 40);
    text(ctx, removed ? '// MEMBER REMOVED' : '// NEW MEMBER', 50, 40, M(16), c);

    tile(ctx, head, 50, 72, 110, c, true);

    text(ctx, 'IN-GAME NAME', 190, 88, M(13), GRAY);

    const n = fit(ctx, clean(nick), 760, 50, B, 30);
    text(ctx, n.value, 190, 129, n.font, WHITE);

    ctx.strokeStyle = rgba(c, 0.18);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 206);
    ctx.lineTo(950, 206);
    ctx.stroke();

    avatar(ctx, discord, 76, 248, 22, c, 3);

    text(ctx, 'DISCORD', 114, 238, M(12), GRAY);

    const d = fit(ctx, clean(discordName), 820, 20, B, 14);
    text(ctx, d.value, 114, 258, d.font, WHITE);

    return png(canvas);
}

async function allyCard({ name, removed = false }) {
    const c = removed ? COLORS.red : COLORS.green;
    const { canvas, ctx } = base(1000, 200, c);
    const label = clean(name);

    brand(ctx, 1000, c, 40);
    text(ctx, removed ? '// ALLY REMOVED' : '// NEW ALLY', 50, 40, M(16), c);

    tile(ctx, null, 50, 72, 110, c);

    text(ctx, [...label][0].toUpperCase(), 105, 129, B(64), c, 'center', 18);

    text(ctx, 'GUILD NAME', 190, 88, M(13), GRAY);

    const n = fit(ctx, label, 760, 50, B, 30);
    text(ctx, n.value, 190, 129, n.font, WHITE);

    return png(canvas);
}

function linkRow(label, url) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel(label)
            .setURL(url)
            .setEmoji({ id: '1544405447619121172', name: 'EME_GUILD' })
    );
}


module.exports = {
    COLORS,
    clean,
    rankCard,
    topCard,
    welcomeCard,
    levelUpCard,
    memberCard,
    allyCard,
    linkRow
};
