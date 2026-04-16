import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock requestAnimationFrame & cancelAnimationFrame
global.requestAnimationFrame = window.requestAnimationFrame = (callback) => setTimeout(callback, 0)
global.cancelAnimationFrame = window.cancelAnimationFrame = (id) => clearTimeout(id)

// Mock window.scrollTo
global.scrollTo = window.scrollTo = jest.fn()

// Mock alert
global.alert = window.alert = jest.fn()

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([]),
    text: () => Promise.resolve(""),
    ok: true,
    status: 200,
  })
) as jest.Mock;
