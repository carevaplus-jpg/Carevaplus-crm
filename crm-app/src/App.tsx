import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ContactsPage } from '@/pages/contacts/ContactsPage';
import { ContactDetailPage } from '@/pages/contacts/ContactDetailPage';
import { CompaniesPage } from '@/pages/companies/CompaniesPage';
import { CompanyDetailPage } from '@/pages/companies/CompanyDetailPage';
import { DealsPage } from '@/pages/deals/DealsPage';
import { DealDetailPage } from '@/pages/deals/DealDetailPage';
import { TasksPage } from '@/pages/tasks/TasksPage';
import { CalendarPage } from '@/pages/calendar/CalendarPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { QuotesPage } from '@/pages/quotes/QuotesPage';
import { QuoteDetailPage } from '@/pages/quotes/QuoteDetailPage';
import { InvoicesPage } from '@/pages/invoices/InvoicesPage';
import { InvoiceDetailPage } from '@/pages/invoices/InvoiceDetailPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { useStore } from '@/store';
import { Toasts, ConfirmHost } from '@/ui';

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-navy-900">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 animate-pulse" />
    </div>
  );
}

export default function App() {
  const hydrated = useStore((s) => s.hydrated);

  if (!hydrated) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/contacts/:id" element={<ContactDetailPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:id" element={<CompanyDetailPage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/deals/:id" element={<DealDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/quotes" element={<QuotesPage />} />
          <Route path="/quotes/:id" element={<QuoteDetailPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Toasts />
      <ConfirmHost />
    </BrowserRouter>
  );
}
