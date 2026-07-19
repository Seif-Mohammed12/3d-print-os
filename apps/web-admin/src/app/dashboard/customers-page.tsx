import { CustomerList } from '../../features/customers/components/customer-list';

export function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Customers</h1>
        <p className="text-muted-foreground">Manage your customer relationships</p>
      </div>
      <CustomerList />
    </div>
  );
}
