// The API stores three neutral states; the words depend on whether you watch or read the title
export const STATUSES = ['planning', 'in_progress', 'done']

const LABELS = {
  anime: { planning: 'Plan to watch', in_progress: 'Watching', done: 'Watched' },
  manga: { planning: 'Plan to read', in_progress: 'Reading', done: 'Read' },
  all: { planning: 'Planning', in_progress: 'In progress', done: 'Done' },
}

export function statusLabel(status, mediaType = 'all') {
  return LABELS[mediaType][status]
}

export function unitsLabel({ media_type, units }) {
  if (!units) return null
  const noun = media_type === 'anime' ? 'episode' : 'chapter'
  return `${units} ${noun}${units === 1 ? '' : 's'}`
}

// "TV · 2023 · 28 episodes"
export function metaLine(item) {
  return [item.kind, item.year, unitsLabel(item)].filter(Boolean).join(' · ')
}

export const entryKey = (item) => `${item.media_type}:${item.anilist_id}`
