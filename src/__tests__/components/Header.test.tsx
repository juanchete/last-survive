import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { AuthProvider } from '@/hooks/useAuth';

// Helper function to render with all necessary providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('Header Component', () => {
  it('should render the header with logo', () => {
    renderWithProviders(<Header />);
    
    const logo = screen.getByAltText('Last Survive');
    expect(logo).toBeInTheDocument();
  });

  it('should render navigation links when not authenticated', () => {
    renderWithProviders(<Header />);
    
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('should have correct link destinations', () => {
    renderWithProviders(<Header />);
    
    const howItWorksLink = screen.getByText('How It Works').closest('a');
    expect(howItWorksLink).toHaveAttribute('href', '/how-it-works');
    
    const loginLink = screen.getByText('Login').closest('a');
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});