import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ChatInput from './ChatInput'

// Mocking icons from lucide-react
jest.mock('lucide-react', () => ({
  Send: () => <span data-testid="send-icon" />,
  Sparkles: () => <span data-testid="sparkles-icon" />,
}))

// Mocking VoiceInput component
jest.mock('../VoiceInput', () => {
  return function MockVoiceInput() {
    return <div data-testid="voice-input" />
  }
})

describe('ChatInput', () => {
  const defaultProps = {
    input: '',
    setInput: jest.fn(),
    isLoading: false,
    onSubmit: jest.fn((e) => e.preventDefault()),
    onVoiceInput: jest.fn(),
    cooldown: 0,
    theme: 'light' as const
  }

  it('renders correctly with placeholder', () => {
    render(<ChatInput {...defaultProps} />)
    expect(screen.getByPlaceholderText(/Stel een vraag/i)).toBeInTheDocument()
  })

  it('calls setInput on change', () => {
    render(<ChatInput {...defaultProps} />)
    const input = screen.getByPlaceholderText(/Stel een vraag/i)
    fireEvent.change(input, { target: { value: 'Hallo' } })
    expect(defaultProps.setInput).toHaveBeenCalledWith('Hallo')
  })

  it('disables input and button when loading', () => {
    render(<ChatInput {...defaultProps} isLoading={true} />)
    const input = screen.getByPlaceholderText(/Stel een vraag/i)
    const button = screen.getByRole('button')
    expect(input).toBeDisabled()
    expect(button).toBeDisabled()
  })

  it('shows cooldown message and disables when cooldown > 0', () => {
    render(<ChatInput {...defaultProps} cooldown={10} />)
    expect(screen.getByPlaceholderText(/Even geduld \(10s\)/i)).toBeInTheDocument()
    const input = screen.getByPlaceholderText(/Even geduld/i)
    expect(input).toBeDisabled()
  })

  it('calls onSubmit when form is submitted', () => {
    render(<ChatInput {...defaultProps} input="Test query" />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(defaultProps.onSubmit).toHaveBeenCalled()
  })
})
