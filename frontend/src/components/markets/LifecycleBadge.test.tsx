import { render, screen } from '@testing-library/react';
import LifecycleBadge from '@/components/markets/LifecycleBadge';

describe('LifecycleBadge', () => {
  it('shows the provided lifecycle status', () => {
    render(<LifecycleBadge status="ACTIVE" />);

    expect(screen.getByText('ACTIVE')).not.toBeNull();
  });
});
