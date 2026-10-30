import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import StatusSelect from '@/components/shelf/StatusSelect.jsx'

function setup(props = {}) {
  const onChange = vi.fn()
  const user = userEvent.setup()
  render(
    <div>
      <StatusSelect id="s" mediaType="anime" value={null} onChange={onChange} label="Status" {...props} />
      <p>outside</p>
    </div>,
  )
  return { user, onChange, trigger: screen.getByRole('button') }
}

describe('StatusSelect', () => {
  it('shows a prompt until the title is shelved', () => {
    const { trigger } = setup()
    expect(trigger).toHaveTextContent('Add to shelf…')
  })

  it('opens a listbox of the three states worded for the medium', async () => {
    const { user, trigger } = setup()
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Plan to watch', 'Watching', 'Watched'])
  })

  it('chooses with the keyboard and returns focus to the trigger', async () => {
    const { user, trigger, onChange } = setup()
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('in_progress')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('chooses with a click, and ignores re-choosing the current status', async () => {
    const { user, trigger, onChange } = setup({ value: 'done' })
    await user.click(trigger)
    expect(screen.getByRole('option', { name: 'Watched' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('option', { name: 'Watched' }))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(trigger)
    await user.click(screen.getByRole('option', { name: 'Plan to watch' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('planning')
  })

  it('closes on Escape and on an outside click without choosing', async () => {
    const { user, trigger, onChange } = setup()
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    await user.click(trigger)
    await user.click(screen.getByText('outside'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})
