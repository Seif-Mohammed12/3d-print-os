import { useEffect, useState, type FormEvent } from 'react';

import { getErrorMessage } from '../../../shared/api/api-error-handler';
import { Button, Dialog, ErrorNotice, Field, Input, Select, Textarea } from '../../../shared/ui';
import { useDefaultShopId } from '../../shop/hooks/use-shop';
import { useSaveCustomer } from '../hooks/use-customers';
import type { Customer, CustomerType } from '../model/customer-types';

const empty = {
  name: '',
  email: '',
  phone: '',
  city: '',
  customer_type: 'individual' as CustomerType,
  business_name: '',
  notes: '',
};

export function CustomerDialog({
  open,
  onClose,
  customer,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
  onSaved?: (customer: Customer) => void;
}) {
  const shopId = useDefaultShopId();
  const save = useSaveCustomer(customer?.id);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) {
      save.reset();
      setForm(
        customer
          ? {
              name: customer.name,
              email: customer.email ?? '',
              phone: customer.phone ?? '',
              city: customer.city ?? '',
              customer_type: customer.customer_type,
              business_name: customer.business_name ?? '',
              notes: customer.notes ?? '',
            }
          : empty,
      );
    }
    // Reset only when the dialog opens or switches customer, not on every mutation state change.
  }, [open, customer]);

  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const optional = (value: string) => (value.trim() ? value.trim() : undefined);
    const saved = await save.mutateAsync({
      ...(customer ? {} : { shop_id: shopId }),
      name: form.name.trim(),
      email: optional(form.email),
      phone: optional(form.phone),
      city: optional(form.city),
      customer_type: form.customer_type,
      business_name: form.customer_type === 'business' ? optional(form.business_name) : undefined,
      notes: optional(form.notes),
    });
    onSaved?.(saved);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={customer ? 'Edit customer' : 'New customer'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="customer-form" loading={save.isPending}>
            {customer ? 'Save changes' : 'Add customer'}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} className="space-y-4">
        <Field label="Name">
          {(props) => (
            <Input
              {...props}
              required
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            {(props) => (
              <Input
                {...props}
                type="email"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
              />
            )}
          </Field>
          <Field label="Phone">
            {(props) => (
              <Input
                {...props}
                type="tel"
                value={form.phone}
                onChange={(e) => update({ phone: e.target.value })}
              />
            )}
          </Field>
          <Field label="Type">
            {(props) => (
              <Select
                {...props}
                value={form.customer_type}
                onChange={(e) => update({ customer_type: e.target.value as CustomerType })}
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </Select>
            )}
          </Field>
          <Field label="City">
            {(props) => (
              <Input
                {...props}
                value={form.city}
                onChange={(e) => update({ city: e.target.value })}
              />
            )}
          </Field>
        </div>
        {form.customer_type === 'business' && (
          <Field label="Business name">
            {(props) => (
              <Input
                {...props}
                value={form.business_name}
                onChange={(e) => update({ business_name: e.target.value })}
              />
            )}
          </Field>
        )}
        <Field label="Notes">
          {(props) => (
            <Textarea
              {...props}
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          )}
        </Field>
        {save.error && <ErrorNotice message={getErrorMessage(save.error)} />}
      </form>
    </Dialog>
  );
}
