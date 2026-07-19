import { useState } from 'react';
import { DollarSign, Clock, CheckCircle, FileText, Send, Plus, MoreVertical } from 'lucide-react';

interface Quote {
  id: string;
  customer: string;
  modelName: string;
  amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'converted';
  createdAt: string;
  expiresAt: string;
}

export function QuotesPage() {
  const [quotes] = useState<Quote[]>([
    {
      id: '1',
      customer: 'John Doe',
      modelName: 'Custom Bracket',
      amount: 15.66,
      status: 'draft',
      createdAt: '2024-01-15',
      expiresAt: '2024-01-22',
    },
    {
      id: '2',
      customer: 'Jane Smith',
      modelName: 'Phone Case',
      amount: 8.5,
      status: 'sent',
      createdAt: '2024-01-14',
      expiresAt: '2024-01-21',
    },
    {
      id: '3',
      customer: 'Tech Corp',
      modelName: 'Gear Assembly',
      amount: 45.0,
      status: 'accepted',
      createdAt: '2024-01-13',
      expiresAt: '2024-01-20',
    },
    {
      id: '4',
      customer: 'Startup Inc',
      modelName: 'Prototype Part',
      amount: 120.0,
      status: 'converted',
      createdAt: '2024-01-10',
      expiresAt: '2024-01-17',
    },
  ]);

  const columns = [
    { id: 'draft', title: 'Draft', icon: FileText },
    { id: 'sent', title: 'Sent', icon: Send },
    { id: 'accepted', title: 'Accepted', icon: CheckCircle },
    { id: 'converted', title: 'Converted', icon: DollarSign },
  ] as const;

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    converted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotes</h1>
          <p className="text-muted-foreground">Manage quotes and customer approvals</p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New Quote
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-gray-600" />
            <h3 className="text-sm font-medium text-muted-foreground">Draft</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {quotes.filter((q) => q.status === 'draft').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-medium text-muted-foreground">Sent</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {quotes.filter((q) => q.status === 'sent').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-medium text-muted-foreground">Accepted</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {quotes.filter((q) => q.status === 'accepted').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-medium text-muted-foreground">Converted</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {quotes.filter((q) => q.status === 'converted').length}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {columns.map((column) => {
          const Icon = column.icon;
          const columnQuotes = quotes.filter((quote) => quote.status === column.id);

          return (
            <div key={column.id} className="rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border p-4">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">{column.title}</h3>
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {columnQuotes.length}
                </span>
              </div>
              <div className="space-y-3 p-4">
                {columnQuotes.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No quotes</p>
                ) : (
                  columnQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="rounded-lg border border-border bg-background p-4 hover:border-border/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground text-sm">{quote.modelName}</h4>
                          <p className="text-xs text-muted-foreground">{quote.customer}</p>
                        </div>
                        <button className="p-1 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-foreground">
                          ${quote.amount.toFixed(2)}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[quote.status]}`}
                        >
                          {column.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Expires: {quote.expiresAt}
                      </div>
                      {quote.status === 'accepted' && (
                        <button className="w-full mt-3 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                          Convert to Order
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
