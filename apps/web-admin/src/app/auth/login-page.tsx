import { Link } from 'react-router-dom';

import { LoginForm } from '../../features/auth/components/login-form';

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">3D Print OS</h1>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Sign in to your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and password to access the control center
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
