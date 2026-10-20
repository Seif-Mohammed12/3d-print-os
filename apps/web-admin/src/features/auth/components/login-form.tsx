import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { getErrorMessage } from '../../../shared/api/api-error-handler';
import { homePathForRoles, PORTAL_TENANT_SLUG } from '../../../shared/lib/constants';
import { Button, ErrorNotice, Field, Input } from '../../../shared/ui';
import { useLogin } from '../hooks/use-auth';

export function LoginForm({ audience }: { audience: 'staff' | 'customer' }) {
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const session = await login.mutateAsync({
        email,
        password,
        ...(audience === 'customer' && PORTAL_TENANT_SLUG
          ? { tenantSlug: PORTAL_TENANT_SLUG }
          : {}),
      });
      navigate(homePathForRoles(session.roles), { replace: true });
    } catch {
      // Shown below from login.error
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Email">
        {(props) => (
          <Input
            {...props}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
        )}
      </Field>
      <Field label="Password">
        {(props) => (
          <Input
            {...props}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </Field>
      {login.error && <ErrorNotice message={getErrorMessage(login.error)} />}
      <Button type="submit" variant="primary" className="w-full" loading={login.isPending}>
        Sign in
      </Button>
    </form>
  );
}
