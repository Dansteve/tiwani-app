"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignup } from '@/context/SignupContext';
import { Button } from '@/components/ui/Button';
import pageStyles from '../signup.module.css';
import styles from './preferences.module.css';

const PREFERENCE_OPTIONS = [
    { id: 'social', label: 'Social & community', icon: '👥' },
    { id: 'travel', label: 'Travel & holidays', icon: '✈️' },
    // { id: 'relationship', label: 'Relationship & partnership', icon: '💑' },
    { id: 'career', label: 'Career', icon: '💼' },
    // { id: 'health', label: 'Health & personal routine', icon: '🏃' },
    { id: 'religion', label: 'Religion & faith', icon: '🙏' },
    // { id: 'cultural', label: 'Cultural & public events', icon: '🎭' },
];

export default function PreferencesStep() {
    const router = useRouter();
    const { userData, updateData, setCurrentStep } = useSignup();
    const [selected, setSelected] = useState<string[]>(userData.selectedChapters || []);

    // Initialize mounted state based on client-side check to avoid hydration issues
    const [mounted] = useState(() => typeof window !== 'undefined');
    
    useEffect(() => {
        // Set current step - using setTimeout to defer and avoid cascading renders
        const timer = setTimeout(() => {
            setCurrentStep(2);
        }, 0);
        
        return () => clearTimeout(timer);
    }, [setCurrentStep]);

    const toggleSelection = (optionId: string) => {
        setSelected(prev =>
            prev.includes(optionId)
                ? prev.filter(id => id !== optionId)
                : [...prev, optionId]
        );
    };

    const handleContinue = () => {
        updateData({ selectedChapters: selected });
        router.push('/signup/continuity');
    };

    if (!mounted) return null; // Hydration fix

    return (
        <div className={pageStyles.pageContainer}>
            <div className={pageStyles.backButtonWrapper}>
                <Link href="/signup" className={pageStyles.backButton}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Go back
                </Link>
            </div>

            <div style={{ textAlign: 'center' }}>
                <div className={styles.welcomeBadge}>
                    Hello {userData.firstName || 'Kunmi'} 👋, welcome to Tiwani
                </div>
            </div>

            <div className={pageStyles.header}>
                <h1 className={pageStyles.title}>What parts of your life do you want to keep going?</h1>
                <p className={pageStyles.subtitle}>
                    Choose the areas of life you&apos;d like support to keep going.
                    You can change these anytime.
                </p>
            </div>

            <div className={styles.preferencesGrid}>
                {PREFERENCE_OPTIONS.map(option => {
                    const isSelected = selected.includes(option.label); // Using label as ID for simplicity based on mock data structure
                    return (
                        <div
                            key={option.id}
                            className={`${styles.preferenceCard} ${isSelected ? styles.selected : ''}`}
                            onClick={() => toggleSelection(option.label)}
                        >
                            <div className={styles.cardContent}>
                                <span>{option.icon}</span>
                                <span>{option.label}</span>
                            </div>
                            <div className={styles.checkbox}>
                                {isSelected && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className={pageStyles.actions}>
                <Button
                    fullWidth
                    onClick={handleContinue}
                // Disabled if none selected? Usually user can skip? Mockup shows "Continue" enabled.
                >
                    Continue
                </Button>
            </div>
        </div>
    );
}
