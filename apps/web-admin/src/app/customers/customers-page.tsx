import { useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';

import { CustomerDialog } from '../../features/customers/components/customer-dialog';
import { useCustomers } from '../../features/customers/hooks/use-customers';
import type { Customer } from '../../features/customers/model/customer-types';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { formatDate } from '../../shared/lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Input,
  PageHeader,
  Skeleton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../shared/ui';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const customers = useCustomers({ search: search.trim() || undefined });
  const [editing, setEditing] = useState<Customer | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const rows = customers.data?.data ?? [];

  const open = (customer?: Customer) => {
    setEditing(customer);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description="People and businesses you print for."
        actions={
          <Button variant="primary" onClick={() => open()}>
            <Plus className="h-4 w-4" />
            Add customer
          </Button>
        }
      />

      <div className="relative mb-4 w-full sm:w-72">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email or phone"
          className="ps-9"
          aria-label="Search customers"
        />
      </div>

      {customers.error && (
        <ErrorNotice
          className="mb-4"
          message={getErrorMessage(customers.error)}
          onRetry={() => customers.refetch()}
        />
      )}

      <Card className={customers.error ? 'hidden' : undefined}>
        {customers.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : customers.error ? null : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'No matches' : 'Add your first customer'}
            description={
              search
                ? 'Try a different search.'
                : 'Customers are linked to their quotes and orders.'
            }
            action={
              !search && (
                <Button variant="primary" onClick={() => open()}>
                  Add customer
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH className="hidden sm:table-cell">Email</TH>
                <TH className="hidden md:table-cell">Phone</TH>
                <TH className="hidden md:table-cell">City</TH>
                <TH>Type</TH>
                <TH className="hidden lg:table-cell">Since</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((customer) => (
                <TR key={customer.id} onClick={() => open(customer)}>
                  <TD>
                    <p className="font-medium text-foreground">{customer.name}</p>
                    {customer.business_name && (
                      <p className="text-xs text-muted-foreground">{customer.business_name}</p>
                    )}
                  </TD>
                  <TD className="hidden text-muted-foreground sm:table-cell">
                    {customer.email ?? '—'}
                  </TD>
                  <TD className="hidden text-muted-foreground md:table-cell">
                    {customer.phone ?? '—'}
                  </TD>
                  <TD className="hidden text-muted-foreground md:table-cell">
                    {customer.city ?? '—'}
                  </TD>
                  <TD>
                    <Badge tone={customer.customer_type === 'business' ? 'accent' : 'neutral'}>
                      {customer.customer_type === 'business' ? 'Business' : 'Individual'}
                    </Badge>
                  </TD>
                  <TD className="hidden text-muted-foreground lg:table-cell">
                    {formatDate(customer.created_at)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <CustomerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} customer={editing} />
    </>
  );
}
