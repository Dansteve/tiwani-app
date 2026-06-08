"use client";

import React from 'react';
import Image from 'next/image';
import styles from '../signup/layout.module.css';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <Image src="/icon-only.svg" alt="Tiwani Logo" width={24} height={24} />
                    </div>
                    <span>TIWANI</span>
                </div>

                <div className={styles.sidebarTextContent}>
                    <h2 className={styles.sidebarHeader}>
                        Welcome back to Tiwani
                    </h2>
                    <p className={styles.sidebarDescription}>
                        Sign in to continue managing your personalized support planning and life chapters.
                    </p>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={styles.mainContent}>
                <div className={styles.mainContentContainer}>
                    {children}
                </div>
            </main>
        </div>
    );
}
