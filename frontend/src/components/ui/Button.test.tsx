import { render, screen } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button type="button">Connect Wallet</Button>);

    expect(screen.getByRole('button', { name: 'Connect Wallet' })).not.toBeNull();
  });
});
