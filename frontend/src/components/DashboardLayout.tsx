'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/accounts', label: 'Linked Accounts' },
    { href: '/dashboard/verification', label: 'Identity Verification' },
    { href: '/dashboard/proofs', label: 'My Proofs' },
    { href: '/dashboard/wallet', label: 'Wallet' },
    { href: '/dashboard/payments', label: 'Payment History' },
  ];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout();
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <Link href="/dashboard" style={styles.logoLink}>
              Bunty
            </Link>
          </div>
          <div style={styles.userSection}>
            <span style={styles.userEmail}>{user?.email}</span>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div style={styles.main}>
        {/* Sidebar Navigation */}
        <nav style={styles.sidebar}>
          <ul style={styles.navList}>
            {navItems.map((item) => (
              <li key={item.href} style={styles.navItem}>
                <Link
                  href={item.href}
                  style={{
                    ...styles.navLink,
                    ...(pathname === item.href ? styles.navLinkActive : {}),
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <main style={styles.content}>{children}</main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e5e5',
    padding: '1rem 2rem',
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  logoLink: {
    color: '#0070f3',
    textDecoration: 'none',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userEmail: {
    color: '#666',
    fontSize: '0.875rem',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    minHeight: 'calc(100vh - 73px)',
  },
  sidebar: {
    width: '250px',
    backgroundColor: 'white',
    borderRight: '1px solid #e5e5e5',
    padding: '2rem 0',
  },
  navList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  navItem: {
    margin: 0,
  },
  navLink: {
    display: 'block',
    padding: '0.75rem 2rem',
    color: '#666',
    textDecoration: 'none',
    transition: 'all 0.2s',
    borderLeft: '3px solid transparent',
  },
  navLinkActive: {
    color: '#0070f3',
    backgroundColor: '#f0f8ff',
    borderLeftColor: '#0070f3',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: '2rem',
  },
};
