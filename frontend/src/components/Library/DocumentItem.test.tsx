import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentItem from './DocumentItem';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, initial, animate, exit, transition, layoutId, layout, style, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => ({
  FileText: () => <span data-testid="file-text-icon" />,
  Star: () => <span data-testid="star-icon" />,
}));

describe('DocumentItem Component', () => {
  const mockProps = {
    doc: 'Protocol_Zorg.pdf',
    isPinned: false,
    isPreviewing: false,
    previewText: 'Dit is een voorbeeldtekst.',
    onHover: jest.fn(),
    onClick: jest.fn(),
    onPin: jest.fn(),
    theme: 'light' as const,
  };

  test('renders the document name', () => {
    render(<DocumentItem {...mockProps} />);
    expect(screen.getByText('Protocol_Zorg.pdf')).toBeInTheDocument();
  });

  test('calls onClick when the item is clicked', () => {
    render(<DocumentItem {...mockProps} />);
    const item = screen.getByText('Protocol_Zorg.pdf').closest('div');
    if (item) fireEvent.click(item);
    expect(mockProps.onClick).toHaveBeenCalledWith('Protocol_Zorg.pdf');
  });

  test('calls onPin when the pin button is clicked', () => {
    render(<DocumentItem {...mockProps} />);
    const pinButton = screen.getByRole('button');
    fireEvent.click(pinButton);
    expect(mockProps.onPin).toHaveBeenCalled();
  });

  test('shows preview text when isPreviewing is true', () => {
    render(<DocumentItem {...mockProps} isPreviewing={true} />);
    expect(screen.getByText(/Dit is een voorbeeldtekst/i)).toBeInTheDocument();
    expect(screen.getByText('Snelle Voorbeeld')).toBeInTheDocument();
  });

  test('calls onHover with doc name on mouse enter', () => {
    render(<DocumentItem {...mockProps} />);
    const item = screen.getByText('Protocol_Zorg.pdf').closest('div');
    if (item) fireEvent.mouseEnter(item);
    expect(mockProps.onHover).toHaveBeenCalledWith('Protocol_Zorg.pdf');
  });

  test('calls onHover with null on mouse leave', () => {
    render(<DocumentItem {...mockProps} />);
    const item = screen.getByText('Protocol_Zorg.pdf').closest('div');
    if (item) fireEvent.mouseLeave(item);
    expect(mockProps.onHover).toHaveBeenCalledWith(null);
  });
});
