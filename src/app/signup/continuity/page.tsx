"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignup } from '@/context/SignupContext';
import { Button } from '@/components/ui/Button';
import pageStyles from '../signup.module.css';
import styles from './continuity.module.css';

const STATUS_OPTIONS = [
    { id: 'going_well', title: 'On track', desc: 'Life is continuing as planned' },
    { id: 'needs_support', title: 'Continuing with support', desc: 'Making it work with adjustments' },
    { id: 'struggling', title: 'Becoming difficult', desc: "It's getting harder to maintain" },
    { id: 'pause', title: 'On hold for now', desc: 'This part of life is paused for now, you can return to it anytime' },
];

// Mapping labels to icons for display
const ICON_MAP: Record<string, string> = {
    'Social & community': '👥',
    'Travel & holidays': '✈️',
    // 'Relationship & partnership': '💑',
    'Career': '💼',
    // 'Health & personal routine': '🏃',
    'Religion & faith': '🙏',
    // 'Cultural & public events': '🎭',
};

export default function ContinuityStep() {
    const router = useRouter();
    const { userData, updateData, setCurrentStep } = useSignup();
    const [statuses, setStatuses] = useState<Record<string, string>>(userData.chapterStatuses || {});
    // Use first chapter as default open? Or all collapsed? Design implies one open.
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        setCurrentStep(3);
        // Expand first item by default if nothing expanded
        if (!expanded && userData.selectedChapters.length > 0) {
            setTimeout(() => {
                setExpanded(userData.selectedChapters[0]);
            }, 0);
        }
    }, [setCurrentStep, userData.selectedChapters, expanded]);

    const handleStatusSelect = (chapter: string, statusId: string) => {
        setStatuses(prev => ({ ...prev, [chapter]: statusId }));
        // Auto collapse? Or stay open? Let's keep open for user to see selection.
        // Or auto-expand next one? That's a nice UX pattern.
        const currentIndex = userData.selectedChapters.indexOf(chapter);
        if (currentIndex < userData.selectedChapters.length - 1) {
            // Optional: Auto expand next
            setExpanded(userData.selectedChapters[currentIndex + 1]);
        }
    };

    const handleToggle = (chapter: string) => {
        setExpanded(prev => (prev === chapter ? null : chapter));
    };

    const handleContinue = () => {
        updateData({ chapterStatuses: statuses });
        router.push('/signup/planning');
    };

    // If no chapters selected, redirect (safety)
    if (userData.selectedChapters.length === 0 && typeof window !== 'undefined') {
        // router.push('/signup/preferences'); // Commented out to avoid hydration mismatch during dev
    }

    return (
        <div className={pageStyles.pageContainer}>
            <div className={pageStyles.backButtonWrapper}>
                <Link href="/signup/preferences" className={pageStyles.backButton}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Go back
                </Link>
            </div>

            <div style={{ textAlign: 'center' }}>
                <div className={styles.welcomeBadge || "badge-placeholder"} style={{
                    display: 'inline-block',
                    background: '#EBECEB',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    marginBottom: '1.5rem'
                }}>
                    Enjoy Tiwani very soon
                </div>
            </div>

            <div className={pageStyles.header}>
                <h1 className={pageStyles.title}>How is life feeling right now?</h1>
                <p className={pageStyles.subtitle}>
                    There&apos;s no right or wrong answer, this just helps us know where to start.
                </p>
            </div>

            <div className={styles.accordionsList}>
                {userData.selectedChapters.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666' }}>No areas selected. Please go back.</p>
                ) : (
                    userData.selectedChapters.map(chapter => {
                        const isExpanded = expanded === chapter;
                        const currentStatus = statuses[chapter];

                        return (
                            <div key={chapter} className={styles.accordionItem}>
                                <div
                                    className={styles.accordionHeader}
                                    onClick={() => handleToggle(chapter)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span className={styles.icon}>{ICON_MAP[chapter] || '✨'}</span>
                                        <span>{chapter}</span>
                                    </div>

                                    {/* Chevron Icon */}
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{
                                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s'
                                        }}
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>

                                {isExpanded && (
                                    <div className={styles.accordionContent}>
                                        {STATUS_OPTIONS.map(opt => (
                                            <div
                                                key={opt.id}
                                                className={`${styles.optionCard} ${currentStatus === opt.id ? styles.selected : ''}`}
                                                onClick={() => handleStatusSelect(chapter, opt.id)}
                                            >
                                                <div className={styles.optionTitle}>{opt.title}</div>
                                                <div className={styles.optionDesc}>{opt.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div className={pageStyles.actions}>
                <Button onClick={handleContinue} fullWidth>
                    Continue
                </Button>
            </div>
        </div>
    );
}
