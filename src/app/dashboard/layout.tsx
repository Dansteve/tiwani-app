"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React from 'react';
import styles from './layout.module.css';
import { DashboardProvider, useDashboard, TABS } from './DashboardContext';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSignup } from '@/context/SignupContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardProvider>
            <DashboardContent>{children}</DashboardContent>
        </DashboardProvider>
    );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const { activeTab, setActiveTab } = useDashboard();
    const { deleteAccount } = useSignup();
    const profileWrapperRef = React.useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        // Clear any auth state if needed
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('tiwani_user_email');
        }
        router.push('/');
    };

    const handleDeleteAccount = async () => {
        const confirmed = window.confirm(
            'Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone. All your data will be permanently removed.'
        );

        if (!confirmed) {
            return; // User cancelled, don't proceed
        }

        const success = await deleteAccount();
        if (success) {
            setShowDeleteModal(false);
            // Redirect to home page
            window.location.href = '/';
        } else {
            alert('Failed to delete account. Please try again.');
        }
    };

    // Close profile dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                profileWrapperRef.current &&
                !profileWrapperRef.current.contains(event.target as Node)
            ) {
                setIsProfileOpen(false);
            }
        };

        if (isProfileOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileOpen]);

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <Image src="/icon-only.svg" alt="Tiwani Logo" width={20} height={20} />
                    </div>
                    <span>TIWANI</span>
                </div>

                <nav className={styles.nav}>
                    <div className={`${styles.navItem} ${styles.active}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        <span>Overview</span>
                    </div>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.navItem} onClick={handleLogout}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span>Logout</span>
                    </div>
                </div>
            </aside>

            <main className={styles.main}>
                <div className={styles.topBar}>
                    <h1 className={styles.pageTitle}>Overview</h1>
                    <div className={styles.topActions}>
                        <div className={styles.helpIcon}>
                            <Image src="/help.svg" alt="Help" width={40} height={40} unoptimized />
                        </div>
                        <div className={styles.profileWrapper} ref={profileWrapperRef}>
                            <div
                                className={styles.userAvatar}
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                            >
                                <Image
                                    src="/profile.png"
                                    alt="Profile"
                                    width={40}
                                    height={40}
                                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                                    unoptimized
                                />
                            </div>

                            {isProfileOpen && (
                                <div className={styles.profileDropdown}>
                                    <div className={styles.dropdownItem} onClick={handleLogout}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                            <polyline points="16 17 21 12 16 7"></polyline>
                                            <line x1="21" y1="12" x2="9" y2="12"></line>
                                        </svg>
                                        <span>Logout</span>
                                    </div>
                                    <div className={`${styles.dropdownItem} ${styles.deleteOption}`} onClick={() => {
                                        setIsProfileOpen(false);
                                        setShowDeleteModal(true);
                                    }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                        <span style={{ color: '#ef4444' }}>Delete Account</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {children}
            </main>

            {/* Mobile Navigation */}
            <nav className={styles.mobileNav}>
                {TABS.map(tab => (
                    <div
                        key={tab.id}
                        className={`${styles.mobileNavItem} ${activeTab === tab.id ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.id === 'life' && (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                        )}
                        {tab.id === 'children' && (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        )}
                        {tab.id === 'profile' && (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        )}
                        <span>{tab.label}</span>
                    </div>
                ))}
            </nav>

            {/* Delete Account Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Account"
            >
                <div style={{ padding: '1rem 0' }}>
                    <p style={{ 
                        marginBottom: '1.5rem', 
                        color: 'var(--text-main)',
                        lineHeight: '1.6'
                    }}>
                        Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
                    </p>
                    <p style={{ 
                        marginBottom: '2rem', 
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem',
                        lineHeight: '1.6'
                    }}>
                        Deleting your Tiwani account is permanent. You will lose access to all your personalized support maps, child profiles, and care history. Any active planning sessions will be terminated immediately.
                    </p>
                    <div style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        justifyContent: 'flex-end' 
                    }}>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleDeleteAccount}
                            style={{ 
                                background: '#DC2626', 
                                color: 'white',
                                border: 'none'
                            }}
                        >
                            Delete Account
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
