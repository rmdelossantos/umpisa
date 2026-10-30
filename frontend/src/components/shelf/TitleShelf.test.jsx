import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import TitleShelf from '@/components/shelf/TitleShelf.jsx'

const ENTRIES = [
  {
    id: 1,
    media_type: 'anime',
    anilist_id: 154587,
    title: 'Frieren',
    status: 'in_progress',
    kind: 'TV',
    year: 2023,
    units: 28,
    image_url: null,
  },
  {
    id: 2,
    media_type: 'manga',
    anilist_id: 30002,
    title: 'Berserk',
    status: 'in_progress',
    kind: 'Manga',
    year: 1989,
    units: null,
    image_url: null,
  },
]

function Harness({ onStatus = vi.fn(), onRemove = vi.fn() }) {
  const [selectedId, setSelectedId] = useState(null)
  return (
    <TitleShelf
      entries={ENTRIES}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onStatus={onStatus}
      onRemove={onRemove}
    />
  )
}

describe('TitleShelf', () => {
  it('stands each title as a spine and pulls one out when chosen', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const frieren = screen.getByRole('button', { name: 'Frieren (anime)' })
    expect(frieren).toHaveAttribute('aria-pressed', 'false')

    await user.click(frieren)
    expect(frieren).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Frieren' })).toBeInTheDocument()
    expect(screen.getByText('TV · 2023 · 28 episodes')).toBeInTheDocument()

    await user.click(frieren)
    expect(screen.queryByRole('heading', { name: 'Frieren' })).not.toBeInTheDocument()
  })

  it('asks before removing, and Keep cancels', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn().mockResolvedValue()
    render(<Harness onRemove={onRemove} />)
    await user.click(screen.getByRole('button', { name: 'Berserk (manga)' }))

    await user.click(screen.getByRole('button', { name: 'Remove from shelf' }))
    await user.click(screen.getByRole('button', { name: 'Keep' }))
    expect(onRemove).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Remove from shelf' }))
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onRemove).toHaveBeenCalledWith(ENTRIES[1])
  })

  it('shows the error when re-filing fails', async () => {
    const user = userEvent.setup()
    const onStatus = vi.fn().mockRejectedValue(new Error('The anime database isn’t responding.'))
    render(<Harness onStatus={onStatus} />)
    await user.click(screen.getByRole('button', { name: 'Frieren (anime)' }))
    await user.click(screen.getByRole('button', { name: /Status/ }))
    await user.click(screen.getByRole('option', { name: 'Watched' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('isn’t responding')
  })
})
