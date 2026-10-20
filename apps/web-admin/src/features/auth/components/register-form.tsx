import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { getErrorMessage } from '../../../shared/api/api-error-handler';
import { PORTAL_TENANT_SLUG } from '../../../shared/lib/constants';
import { Button, ErrorNotice, Field, Input } from '../../../shared/ui';
import { useRegister, useRegisterCustomer } from '../hooks/use-auth';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** Creates a new shop (tenant) and its owner account. */
export function BusinessRegisterForm() {
  const navigate = useNavigate();
  const register = useRegister();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    tenantName: '',
    tenantSlug: '',
    slugEdited: false,
  });

  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await register.mutateAsync({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        tenantName: form.tenantName,
        tenantSlug: form.tenantSlug,
        shopName: form.tenantName,
      });
      navigate('/app', { replace: true });
    } catch {
      // Shown below from register.error
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Your name">
        {(props) => (
          <Input
            {...props}
            required
            autoComplete="name"
            value={form.fullName}
            onChange={(event) => update({ fullName: event.target.value })}
          />
        )}
      </Field>
      <Field label="Business name">
        {(props) => (
          <Input
            {...props}
            required
            value={form.tenantName}
            onChange={(event) =>
              update({
                tenantName: event.target.value,
                ...(form.slugEdited ? {} : { tenantSlug: slugify(event.target.value) }),
              })
            }
            placeholder="3D Print It Egypt"
          />
        )}
      </Field>
      <Field
        label="Shop address"
        hint="Used in your customer portal link. Lowercase letters, numbers and dashes."
      >
        {(props) => (
          <Input
            {...props}
            required
            pattern="[a-z0-9-]+"
            value={form.tenantSlug}
            onChange={(event) =>
              update({ tenantSlug: slugify(event.target.value), slugEdited: true })
            }
            placeholder="print-it-egypt"
          />
        )}
      </Field>
      <Field label="Email">
        {(props) => (
          <Input
            {...props}
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(event) => update({ email: event.target.value })}
          />
        )}
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        {(props) => (
          <Input
            {...props}
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => update({ password: event.target.value })}
          />
        )}
      </Field>
      {register.error && <ErrorNotice message={getErrorMessage(register.error)} />}
      <Button type="submit" variant="primary" className="w-full" loading={register.isPending}>
        Create shop
      </Button>
    </form>
  );
}

/** Customer account for this build's shop portal. */
export function CustomerRegisterForm() {
  const navigate = useNavigate();
  const register = useRegisterCustomer();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    companyName: '',
  });

  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  if (!PORTAL_TENANT_SLUG) {
    return (
      <ErrorNotice message="Sign-up isn't set up for this portal yet. Ask the shop for an account." />
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await register.mutateAsync({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        tenantSlug: PORTAL_TENANT_SLUG,
        ...(form.phone ? { phone: form.phone } : {}),
        ...(form.companyName ? { companyName: form.companyName } : {}),
      });
      navigate('/portal/upload', { replace: true });
    } catch {
      // Shown below from register.error
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Full name">
        {(props) => (
          <Input
            {...props}
            required
            autoComplete="name"
            value={form.fullName}
            onChange={(event) => update({ fullName: event.target.value })}
          />
        )}
      </Field>
      <Field label="Email">
        {(props) => (
          <Input
            {...props}
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(event) => update({ email: event.target.value })}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone" hint="Optional">
          {(props) => (
            <Input
              {...props}
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => update({ phone: event.target.value })}
              placeholder="+20 100 000 0000"
            />
          )}
        </Field>
        <Field label="Company" hint="Optional">
          {(props) => (
            <Input
              {...props}
              autoComplete="organization"
              value={form.companyName}
              onChange={(event) => update({ companyName: event.target.value })}
            />
          )}
        </Field>
      </div>
      <Field label="Password" hint="At least 8 characters.">
        {(props) => (
          <Input
            {...props}
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => update({ password: event.target.value })}
          />
        )}
      </Field>
      {register.error && <ErrorNotice message={getErrorMessage(register.error)} />}
      <Button type="submit" variant="primary" className="w-full" loading={register.isPending}>
        Create account
      </Button>
    </form>
  );
}
