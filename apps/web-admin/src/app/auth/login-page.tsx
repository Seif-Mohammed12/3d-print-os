import { Link } from 'react-router-dom';

import { AuthShell } from '../../features/auth/components/auth-shell';
import { LoginForm } from '../../features/auth/components/login-form';

export function LoginPage({ audience = 'staff' }: { audience?: 'staff' | 'customer' }) {
  const registerPath = audience === 'staff' ? '/register' : '/portal/register';
  return (
    <AuthShell
      audience={audience}
      title="Welcome back"
      subtitle={
        audience === 'staff' ? 'Sign in to your shop.' : 'Sign in to see your quotes and orders.'
      }
      footer={
        <>
          {audience === 'staff' ? 'New to Print OS? ' : "Don't have an account? "}
          <Link to={registerPath} className="font-medium text-primary hover:underline">
            {audience === 'staff' ? 'Create a shop' : 'Create an account'}
          </Link>
        </>
      }
    >
      <LoginForm audience={audience} />
    </AuthShell>
  );
}
