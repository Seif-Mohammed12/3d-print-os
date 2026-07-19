import { Link } from 'react-router-dom';

import { RegisterForm } from '../../features/auth/components/register-form';

export function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">3D Print OS</h1>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Create your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Set up your 3D printing business control center
          </p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
