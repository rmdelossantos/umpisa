import { fireEvent, render } from '@testing-library/react'
import { expect, it } from 'vitest'
import Cover from '@/components/ui/Cover.jsx'

it('shows the image, then the hatched blank if it fails to load', () => {
  const { container } = render(<Cover src="https://s4.anilist.co/cover.jpg" />)
  const img = container.querySelector('img')
  expect(img).toHaveAttribute('src', 'https://s4.anilist.co/cover.jpg')

  fireEvent.error(img)
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('.cover-blank')).toBeInTheDocument()
})

it('shows the blank when there is no cover', () => {
  const { container } = render(<Cover src={null} small />)
  expect(container.querySelector('.cover.cover-sm.cover-blank')).toBeInTheDocument()
})
