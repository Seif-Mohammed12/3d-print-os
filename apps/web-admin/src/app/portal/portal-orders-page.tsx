import { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, XCircle, RefreshCw, Eye } from 'lucide-react';
import { apiClient } from '../../shared/api/api-client';

interface Order {
  id: string;
  status: 'pending' | 'processing' | 'printing' | 'completed' | 'cancelled';
  quoteId: string;
  estimatedPrice?: number;
  actualPrice?: number;
  createdAt: string;
  completedAt?: string;
  fileName?: string;
}

export function PortalOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.instance.get('/portal/orders');
      setOrders(response.data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'printing':
        return <Package className="h-4 w-4 text-purple-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'printing':
        return 'Printing';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Orders</h1>
          <p className="text-muted-foreground">View and track your print orders</p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No orders yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Accepted quotes will appear here as orders
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Order #{order.id}</p>
                    <p className="text-xs text-muted-foreground">Quote #{order.quoteId}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                    {order.fileName && (
                      <p className="text-xs text-muted-foreground">{order.fileName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(order.status)}
                  <span className="text-sm font-medium text-foreground">
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>

              {order.estimatedPrice && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-lg font-bold text-foreground">
                    {order.actualPrice ? order.actualPrice : order.estimatedPrice} EGP
                  </p>
                </div>
              )}

              {order.completedAt && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-sm text-foreground">{formatDate(order.completedAt)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
