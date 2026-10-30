import { describe, expect, it } from 'vitest'
import { entryKey, metaLine, statusLabel, unitsLabel } from '@/status.js'

describe('statusLabel', () => {
  it('words the three states by medium', () => {
    expect(statusLabel('planning', 'anime')).toBe('Plan to watch')
    expect(statusLabel('in_progress', 'manga')).toBe('Reading')
    expect(statusLabel('done', 'anime')).toBe('Watched')
  })

  it('uses neutral words when showing both media', () => {
    expect(statusLabel('in_progress')).toBe('In progress')
  })
})

describe('unitsLabel', () => {
  it('pluralises episodes and chapters', () => {
    expect(unitsLabel({ media_type: 'anime', units: 1 })).toBe('1 episode')
    expect(unitsLabel({ media_type: 'manga', units: 162 })).toBe('162 chapters')
  })

  it('is empty when the count is unknown', () => {
    expect(unitsLabel({ media_type: 'manga', units: null })).toBeNull()
  })
})

describe('metaLine', () => {
  it('joins the known parts and skips the missing ones', () => {
    expect(metaLine({ media_type: 'anime', kind: 'TV', year: 2023, units: 28 })).toBe('TV · 2023 · 28 episodes')
    expect(metaLine({ media_type: 'manga', kind: 'Manga', year: 1989, units: null })).toBe('Manga · 1989')
  })
})

it('entryKey separates anime and manga with the same id', () => {
  expect(entryKey({ media_type: 'anime', anilist_id: 2 })).not.toBe(entryKey({ media_type: 'manga', anilist_id: 2 }))
})
