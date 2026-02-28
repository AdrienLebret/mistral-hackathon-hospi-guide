/**
 * Pixel art sprite data for the Mistral-inspired triage assistant avatar.
 * Each frame is a 16x16 grid. Palette indices:
 *  0 = transparent
 *  1 = #FF7000 (Mistral orange)
 *  2 = #FFB800 (amber)
 *  3 = #FFFFFF (white)
 *  4 = #0F172A (dark)
 *  5 = #1E293B (mid-gray)
 *  6 = #FF9E44 (light orange)
 *  7 = #22C55E (green accent)
 */

export const PALETTE = [
    'transparent',   // 0
    '#FF7000',       // 1 - Mistral orange
    '#FFB800',       // 2 - amber
    '#FFFFFF',       // 3 - white
    '#0F172A',       // 4 - dark
    '#1E293B',       // 5 - mid gray
    '#FF9E44',       // 6 - light orange
    '#22C55E',       // 7 - green accent
] as const

// Friendly robot/nurse assistant character
const BASE_FRAME: number[][] = [
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 6, 6, 6, 6, 6, 6, 6, 6, 1, 0, 0, 0],
    [0, 0, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 0, 0],
    [0, 0, 1, 3, 4, 3, 3, 3, 3, 4, 3, 3, 3, 1, 0, 0],
    [0, 0, 1, 3, 4, 3, 3, 3, 3, 4, 3, 3, 3, 1, 0, 0],
    [0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0],
    [0, 0, 1, 3, 3, 3, 1, 1, 1, 3, 3, 3, 3, 1, 0, 0],
    [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 7, 1, 1, 7, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 5, 5, 1, 1, 1, 1, 5, 5, 1, 1, 0, 0],
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
]

// Blink frame — eyes closed
const BLINK_FRAME: number[][] = BASE_FRAME.map((row, y) => {
    if (y === 5 || y === 6) {
        return row.map((px, x) => {
            if ((x === 4 || x === 9) && y === 5) return 3
            if ((x === 4 || x === 9) && y === 6) return 4
            return px
        })
    }
    return [...row]
})

// Talking frames — mouth opens/closes
const TALK_OPEN: number[][] = BASE_FRAME.map((row, y) => {
    if (y === 8) {
        return row.map((px, x) => {
            if (x >= 6 && x <= 9) return 4
            return px
        })
    }
    return [...row]
})

// Waving — arm raised
const WAVE_1: number[][] = BASE_FRAME.map((row, y) => {
    if (y === 11) return [0, 0, 0, 0, 1, 1, 7, 1, 1, 7, 1, 1, 0, 1, 0, 0]
    if (y === 10) return [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0]
    if (y === 9) return [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 6]
    return [...row]
})

const WAVE_2: number[][] = BASE_FRAME.map((row, y) => {
    if (y === 11) return [0, 0, 0, 0, 1, 1, 7, 1, 1, 7, 1, 1, 0, 0, 1, 0]
    if (y === 10) return [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1]
    if (y === 9) return [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 1, 0]
    return [...row]
})

// Happy — smile + sparkle eyes
const HAPPY_FRAME: number[][] = BASE_FRAME.map((row, y) => {
    if (y === 5) {
        return row.map((px, x) => {
            if (x === 4 || x === 9) return 2
            return px
        })
    }
    if (y === 7) {
        return row.map((px, x) => {
            if (x >= 5 && x <= 9) return 3
            return px
        })
    }
    if (y === 8) {
        return row.map((px, x) => {
            if (x === 5 || x === 9) return 1
            if (x >= 6 && x <= 8) return 2
            return px
        })
    }
    return [...row]
})

// Listening — slight lean, ear pulse
const LISTEN_FRAME: number[][] = BASE_FRAME.map((row, y) => {
    if (y === 3) return [0, 0, 0, 1, 6, 6, 6, 6, 6, 6, 6, 6, 1, 2, 0, 0]
    return [...row]
})

export type SpriteAnimation = {
    frames: number[][][]
    frameRate: number
}

export const ANIMATIONS: Record<string, SpriteAnimation> = {
    idle: {
        frames: [BASE_FRAME, BASE_FRAME, BASE_FRAME, BASE_FRAME, BASE_FRAME, BLINK_FRAME, BLINK_FRAME, BASE_FRAME],
        frameRate: 300,
    },
    waving: {
        frames: [WAVE_1, WAVE_2, WAVE_1, WAVE_2, BASE_FRAME],
        frameRate: 250,
    },
    talking: {
        frames: [BASE_FRAME, TALK_OPEN, BASE_FRAME, TALK_OPEN],
        frameRate: 200,
    },
    listening: {
        frames: [LISTEN_FRAME, BASE_FRAME, LISTEN_FRAME, BASE_FRAME],
        frameRate: 500,
    },
    happy: {
        frames: [HAPPY_FRAME, BASE_FRAME, HAPPY_FRAME],
        frameRate: 400,
    },
}
