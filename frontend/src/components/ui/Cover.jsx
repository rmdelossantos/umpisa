import { useState } from 'react'

// Cover art hotlinked from AniList's CDN; falls back to a hatched blank when missing or unreachable
export default function Cover({ src, small = false }) {
  const [failed, setFailed] = useState(false)
  const className = `cover${small ? ' cover-sm' : ''}`
  if (!src || failed) return <span className={`${className} cover-blank`} aria-hidden="true" />
  return <img className={className} src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
}
