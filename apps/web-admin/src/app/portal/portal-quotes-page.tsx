import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '../../shared/api/api-client';

interface Quote {
  id: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired';
  estimatedPriceMin?: number;
  estimatedPriceMax?: number;
  createdAt: string;
  notes?: string;
  fileName?: string;
}

export function PortalQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.instance.get('/portal/quotes');
      setQuotes(response.data);
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
      setError('Failed to load quotes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
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
        return 'Pending Review';
      case 'sent':
        return 'Quote Sent';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Quotes</h1>
          <p className="text-muted-foreground">View and manage your quote requests</p>
        </div>
        <button
          onClick={fetchQuotes}
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
          <p className="text-muted-foreground">Loading quotes...</p>
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No quotes yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Upload a model to request your first quote
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div key={quote.id} className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Quote #{quote.id}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(quote.createdAt)}</p>
                    {quote.fileName && (
                      <p className="text-xs text-muted-foreground">{quote.fileName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(quote.status)}
                  <span className="text-sm font-medium text-foreground">
                    {getStatusText(quote.status)}
                  </span>
                </div>
              </div>

              {quote.estimatedPriceMin && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Estimated Price Range</p>
                  <p className="text-lg font-bold text-foreground">
                    {quote.estimatedPriceMin} - {quote.estimatedPriceMax} EGP
                  </p>
                </div>
              )}

              {quote.notes && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm text-foreground">{quote.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
