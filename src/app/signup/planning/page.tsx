"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignup } from '@/context/SignupContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import pageStyles from '../signup.module.css';
import styles from './planning.module.css';

interface Child {
    id: string; // generated ID
    firstName: string;
    lastName: string;
    ageRange: string;
    supportNeeds: string;
}

export default function PlanningStep() {
    const router = useRouter();
    const { userData, updateData, setCurrentStep } = useSignup();

    // Initialize with one child if empty
    const [children, setChildren] = useState<Child[]>(
        userData.children.length > 0
            ? userData.children
            : [{ id: '1', firstName: '', lastName: '', ageRange: '', supportNeeds: '' }]
    );

    useEffect(() => {
        setCurrentStep(4);
    }, [setCurrentStep]);

    const updateChild = (id: string, field: keyof Child, value: string) => {
        setChildren(prev => prev.map(child =>
            child.id === id ? { ...child, [field]: value } : child
        ));
    };

    const addChild = () => {
        const newId = (children.length + 1).toString(); // Simple ID generation
        setChildren(prev => [
            ...prev,
            { id: newId, firstName: '', lastName: '', ageRange: '', supportNeeds: '' }
        ]);
    };

    const removeChild = (id: string) => {
        if (children.length === 1) return; // Prevent removing last child? Or allow empty? Mockup implies at least one.
        setChildren(prev => prev.filter(c => c.id !== id));
    };

    // Validate that all children have required fields filled
    const isFormValid = children.every(child => 
        child.firstName.trim() !== '' &&
        child.lastName.trim() !== '' &&
        child.ageRange !== '' &&
        child.supportNeeds !== ''
    ) && children.length > 0;

    const handleComplete = () => {
        // Validate before proceeding
        if (!isFormValid) {
            return; // Don't proceed if form is invalid
        }
        
        updateData({ children });
        // Simulate API call / Redirect
        // In real app, we would POST userData to backend here.

        // Redirect to loading first, then dashboard
        router.push('/signup/loading');
    };

    return (
        <div className={pageStyles.pageContainer}>
            <div className={pageStyles.backButtonWrapper}>
                <Link href="/signup/continuity" className={pageStyles.backButton}>
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
                <h1 className={pageStyles.title}>Who are you planning with?</h1>
                <p className={pageStyles.subtitle}>
                    Tell us a bit about your child so we can tailor suggestions and planning support.
                </p>
            </div>

            <div className={styles.formsList}>
                {children.map((child, index) => (
                    <div key={child.id} className={styles.childFormContainer}>
                        <div className={styles.childFormHeader}>
                            <span>Your child {index + 1}</span>
                            {children.length > 1 && (
                                <button className={styles.removeButton} onClick={() => removeChild(child.id)}>
                                    Remove
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            )}
                        </div>

                        <div className={styles.formGrid}>
                            <div className={pageStyles.row}>
                                <Input
                                    placeholder="First name"
                                    value={child.firstName}
                                    onChange={(e) => updateChild(child.id, 'firstName', e.target.value)}
                                    required
                                />
                                <Input
                                    placeholder="Last name"
                                    value={child.lastName}
                                    onChange={(e) => updateChild(child.id, 'lastName', e.target.value)}
                                    required
                                />
                            </div>

                            <select
                                className={styles.select}
                                value={child.ageRange}
                                onChange={(e) => updateChild(child.id, 'ageRange', e.target.value)}
                                required
                                title="Age range"
                            >
                                <option value="" disabled>Age range *</option>
                                <option value="2-4">2-4 years</option>
                                <option value="5-7">5-7 years</option>
                                <option value="8-10">8-10 years</option>
                                <option value="11-12">11-12 years</option>
                            </select>

                            <select
                                className={styles.select}
                                value={child.supportNeeds}
                                onChange={(e) => updateChild(child.id, 'supportNeeds', e.target.value)}
                                required
                                title="Support needs"
                            >
                                <option value="" disabled>How much support do they usually need day-to-day? *</option>
                                <option value="low">A little support</option>
                                <option value="medium">Some support</option>
                                <option value="high">A lot of support</option>
                            </select>
                        </div>
                    </div>
                ))}

                <div className={styles.addButtonContainer}>
                    <button className={styles.addChildButton} onClick={addChild}>
                        + Add another child
                    </button>
                </div>
            </div>

            <div className={pageStyles.actions}>
                {!isFormValid && (
                    <p style={{ 
                        color: '#DC2626', 
                        fontSize: '0.875rem', 
                        textAlign: 'center', 
                        marginBottom: '0.5rem' 
                    }}>
                        Please fill in all required fields for {children.length === 1 ? 'your child' : 'all children'} before continuing.
                    </p>
                )}
                <Button onClick={handleComplete} fullWidth disabled={!isFormValid}>
                    Complete setup
                </Button>
            </div>
        </div>
    );
}
