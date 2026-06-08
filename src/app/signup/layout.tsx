"use client";

import React from 'react';
import Image from 'next/image';
import { SignupProvider, useSignup } from '@/context/SignupContext';
import styles from './layout.module.css';

// Separate component to consume context
function SignupLayoutContent({ children }: { children: React.ReactNode }) {
    const { currentStep } = useSignup();

    const steps = [
        { id: 1, label: 'Sign up' },
        { id: 2, label: 'Life preferences' },
        { id: 3, label: 'Life continuity check' },
        { id: 4, label: 'Planning context' },
    ];

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
                        Create your account in a few clicks
                    </h2>
                    <p className={styles.sidebarDescription}>
                        This won’t take long, Just a few questions to set things up.
                    </p>
                </div>

                <div className={styles.stepper}>
                    {steps.map((step) => {
                        const isActive = step.id === currentStep;
                        const isCompleted = step.id < currentStep;

                        return (
                            <div key={step.id} className={styles.stepItem}>
                                <div className={`${styles.stepCircle} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}>
                                    {isCompleted ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    ) : (
                                        step.id
                                    )}
                                </div>
                                <span className={`${styles.stepLabel} ${isActive ? styles.active : ''}`}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
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

export default function SignupLayout({ children }: { children: React.ReactNode }) {
    return (
        <SignupLayoutContent>{children}</SignupLayoutContent>
    );
}
