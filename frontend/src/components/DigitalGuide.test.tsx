import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import DigitalGuide from './DigitalGuide'
import { useDigitalGuide } from '../hooks/useDigitalGuide'

// Mocking useDigitalGuide hook
jest.mock('../hooks/useDigitalGuide')

// Mocking usePdfLoader hook
jest.mock('../hooks/usePdfLoader', () => ({
  usePdfLoader: jest.fn(() => ({ pdfBlobUrl: null, isPdfLoading: false }))
}))

// Mocking next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />
}))

// Mocking next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}))

// Mocking framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mocking lucide-react
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon" />,
  FileText: () => <span data-testid="file-text-icon" />,
  AlertTriangle: () => <span data-testid="alert-triangle-icon" />,
  Sparkles: () => <span data-testid="sparkles-icon" />,
  ClipboardList: () => <span data-testid="clipboard-list-icon" />,
  Send: () => <span data-testid="send-icon" />,
  Home: () => <span data-testid="home-icon" />,
}))

// Mocking sub-components to keep test focused
jest.mock('./Chat/MessageItem', () => () => <div data-testid="message-item" />)
jest.mock('./Chat/ChatInput', () => () => <div data-testid="chat-input" />)
jest.mock('./Chat/ThreadSidebar', () => () => <div data-testid="thread-sidebar" />)
jest.mock('./Library/DocumentSidebar', () => () => <div data-testid="document-sidebar" />)
jest.mock('./Library/OutlineView', () => () => <div data-testid="outline-view" />)
jest.mock('./Library/DocumentToolbar', () => () => <div data-testid="document-toolbar" />)
jest.mock('./FourMoments', () => () => <div data-testid="four-moments" />)

// Mocking react-resizable-panels
jest.mock('react-resizable-panels', () => ({
  Group: ({ children }: any) => <div>{children}</div>,
  Panel: ({ children }: any) => <div>{children}</div>,
  Separator: () => <div />,
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('DigitalGuide', () => {
  const mockUseDigitalGuide = useDigitalGuide as jest.Mock

  beforeEach(() => {
    mockUseDigitalGuide.mockReturnValue({
      messages: [],
      setMessages: jest.fn(),
      input: '',
      setInput: jest.fn(),
      isLoading: false,
      threads: [],
      activeThreadId: null,
      setActiveThreadId: jest.fn(),
      activeDocument: null,
      setActiveDocument: jest.fn(),
      activePage: null,
      setActivePage: jest.fn(),
      availableDocs: [],
      pinnedDocs: [],
      recentDocs: [],
      searchQuery: '',
      setSearchQuery: jest.fn(),
      cooldown: 0,
      toast: { show: false, message: '' },
      suggestions: ['Protocol A', 'Protocol B'],
      searchResults: [],
      isSearching: false,
      previews: {},
      outline: [],
      showOutline: false,
      setShowOutline: jest.fn(),
      theme: 'light',
      recentUpdates: [],
      showUpdateBanner: false,
      setShowUpdateBanner: jest.fn(),
      setDossierModal: jest.fn(),
      messagesEndRef: { current: null },
      handleSubmit: jest.fn(),
      handleDocumentClick: jest.fn(),
      showToast: jest.fn(),
    })
  })

  it('renders correctly with welcome state', () => {
    render(<DigitalGuide />)
    expect(screen.getAllByText(/Digitale Gids/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Waarmee kan ik je helpen vandaag/i)).toBeInTheDocument()
  })

  it('renders suggestions when no messages', () => {
    render(<DigitalGuide />)
    expect(screen.getByText('Protocol A')).toBeInTheDocument()
    expect(screen.getByText('Protocol B')).toBeInTheDocument()
  })

  it('calls handleSubmit when a suggestion is clicked', () => {
    const { handleSubmit } = mockUseDigitalGuide()
    render(<DigitalGuide />)
    const suggestion = screen.getByText('Protocol A')
    fireEvent.click(suggestion)
    expect(handleSubmit).toHaveBeenCalledWith('Protocol A')
  })

  it('shows document sidebar when no active document', () => {
    render(<DigitalGuide />)
    expect(screen.getByTestId('document-sidebar')).toBeInTheDocument()
  })

  it('shows iframe when an active document is selected', () => {
    mockUseDigitalGuide.mockReturnValue({
      ...mockUseDigitalGuide(),
      activeDocument: 'test.pdf'
    })
    render(<DigitalGuide />)
    expect(screen.queryByTestId('document-sidebar')).not.toBeInTheDocument()
    expect(screen.getByTestId('document-toolbar')).toBeInTheDocument()
  })
})
