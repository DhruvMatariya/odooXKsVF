import { createBrowserRouter, Navigate } from 'react-router';
import { LandingPage } from './screens/public/LandingPage';
import { AuthLayout } from './components/layout/AuthLayout';
import { CustomerLayout } from './components/layout/CustomerLayout';
import { VendorLayout } from './components/layout/VendorLayout';
import { Login } from './screens/auth/Login';
import { Register } from './screens/auth/Register';
import { ForgotPassword } from './screens/auth/ForgotPassword';
import { ResetPassword } from './screens/auth/ResetPassword';
import { EmailVerification } from './screens/auth/EmailVerification';
import { Profile } from './screens/auth/Profile';
import { ProductListing } from './screens/customer/ProductListing';
import { ProductDetail } from './screens/customer/ProductDetail';
import { MyOrders } from './screens/customer/MyOrders';
import { OrderDetail as CustomerOrderDetail } from './screens/customer/OrderDetail';
import { Dashboard } from './screens/vendor/Dashboard';
import { ProductList } from './screens/vendor/ProductList';
import { AddEditProduct } from './screens/vendor/AddEditProduct';
import { ManageInventory } from './screens/vendor/ManageInventory';
import { ManagePricing } from './screens/vendor/ManagePricing';
import { VendorOrders } from './screens/vendor/VendorOrders';
import { AddOfflineOrder } from './screens/vendor/AddOfflineOrder';
import { VendorOrderDetail } from './screens/vendor/VendorOrderDetail';
import { InspectionForm } from './screens/vendor/InspectionForm';
import { ReturnSlots } from './screens/vendor/ReturnSlots';
import { LateFeeRules } from './screens/vendor/LateFeeRules';
import { CancellationPolicy } from './screens/vendor/CancellationPolicy';

function RedirectLogin() { return <Navigate to="/login" replace />; }
function RedirectProducts() { return <Navigate to="/customer/products" replace />; }
function RedirectDashboard() { return <Navigate to="/vendor/dashboard" replace />; }

export const router = createBrowserRouter([
  {
    path: '/',
    Component: LandingPage,
  },
  {
    Component: AuthLayout,
    children: [
      { path: 'login', Component: Login },
      { path: 'register', Component: Register },
      { path: 'forgot-password', Component: ForgotPassword },
      { path: 'reset-password', Component: ResetPassword },
      { path: 'verify-email', Component: EmailVerification },
    ],
  },
  {
    path: 'customer',
    Component: CustomerLayout,
    children: [
      { index: true, Component: RedirectProducts },
      { path: 'products', Component: ProductListing },
      { path: 'products/:id', Component: ProductDetail },
      { path: 'orders', Component: MyOrders },
      { path: 'orders/:id', Component: CustomerOrderDetail },
      { path: 'profile', Component: Profile },
    ],
  },
  {
    path: 'vendor',
    Component: VendorLayout,
    children: [
      { index: true, Component: RedirectDashboard },
      { path: 'dashboard', Component: Dashboard },
      { path: 'products', Component: ProductList },
      { path: 'products/new', Component: AddEditProduct },
      { path: 'products/:id/edit', Component: AddEditProduct },
      { path: 'products/:id/inventory', Component: ManageInventory },
      { path: 'products/:id/pricing', Component: ManagePricing },
      { path: 'orders', Component: VendorOrders },
      { path: 'orders/new', Component: AddOfflineOrder },
      { path: 'orders/:id', Component: VendorOrderDetail },
      { path: 'orders/:id/inspection', Component: InspectionForm },
      { path: 'settings/return-slots', Component: ReturnSlots },
      { path: 'settings/late-fee', Component: LateFeeRules },
      { path: 'settings/cancellation', Component: CancellationPolicy },
      { path: 'profile', Component: Profile },
    ],
  },
]);
