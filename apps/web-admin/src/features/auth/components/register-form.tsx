import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useRegister } from '../hooks/use-auth';
import type { RegisterData } from '../model/auth-types';

export function RegisterForm() {
  const navigate = useNavigate();
  const register = useRegister();
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    fullName: '',
    tenantName: '',
    tenantSlug: '',
    shopName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutateAsync(formData);
      navigate('/dashboard');
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="John Doe"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="••••••••"
        />
      </div>
      <div>
        <label htmlFor="tenantName" className="block text-sm font-medium text-foreground">
          Business Name
        </label>
        <input
          id="tenantName"
          type="text"
          required
          value={formData.tenantName}
          onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="My 3D Printing Business"
        />
      </div>
      <div>
        <label htmlFor="tenantSlug" className="block text-sm font-medium text-foreground">
          Business Slug
        </label>
        <input
          id="tenantSlug"
          type="text"
          required
          value={formData.tenantSlug}
          onChange={(e) => setFormData({ ...formData, tenantSlug: e.target.value })}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="my-business"
        />
      </div>
      <div>
        <label htmlFor="shopName" className="block text-sm font-medium text-foreground">
          Shop Name
        </label>
        <input
          id="shopName"
          type="text"
          required
          value={formData.shopName}
          onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Main Shop"
        />
      </div>
      <button
        type="submit"
        disabled={register.isPending}
        className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {register.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </button>
      {register.error && <p className="text-sm text-destructive">{register.error.message}</p>}
    </form>
  );
}
