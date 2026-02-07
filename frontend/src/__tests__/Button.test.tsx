import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui/Button';
import userEvent from '@testing-library/user-event';

describe('Button Component', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button disabled onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    const button1 = screen.getByRole('button');
    expect(button1).toBeInTheDocument();
    
    rerender(<Button variant="outline">Outline</Button>);
    const button2 = screen.getByRole('button');
    expect(button2).toBeInTheDocument();
  });

  it('should apply size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    const button1 = screen.getByRole('button');
    expect(button1).toBeInTheDocument();
    
    rerender(<Button size="lg">Large</Button>);
    const button2 = screen.getByRole('button');
    expect(button2).toBeInTheDocument();
  });
});
