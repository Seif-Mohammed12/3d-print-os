import { Link } from 'react-router-dom';

import { AuthShell } from '../../features/auth/components/auth-shell';
import {
  BusinessRegisterForm,
  CustomerRegisterForm,
} from '../../features/auth/components/register-form';

export function RegisterPage({ audience = 'staff' }: { audience?: 'staff' | 'customer' }) {
  const loginPath = audience === 'staff' ? '/login' : '/portal/login';
  return (
    <AuthShell
      audience={audience}
      title={audience === 'staff' ? 'Create your shop' : 'Create your account'}
      subtitle={
        audience === 'staff'
          ? 'Set up your print shop in a minute.'
          : 'Get instant prices for your 3D prints.'
      }
      footer={
        <>
          Already have an account?{' '}
          <Link to={loginPath} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {audience === 'staff' ? <BusinessRegisterForm /> : <CustomerRegisterForm />}
    </AuthShell>
  );
}
