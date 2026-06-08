"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignup } from '@/context/SignupContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from './signup.module.css';



export default function SignupStep1() {
    const router = useRouter();
    const { userData, updateData } = useSignup();

    const [formData, setFormData] = useState({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        password: userData.password || '',
    });

    const [passwordReqs, setPasswordReqs] = useState({
        lowercase: false,
        uppercase: false,
        number: false,
        length: false,
    });

    // Simple password validation logic
    useEffect(() => {
        const pwd = formData.password;
        setPasswordReqs({
            lowercase: /[a-z]/.test(pwd),
            uppercase: /[A-Z]/.test(pwd),
            number: /[0-9]/.test(pwd),
            length: pwd.length >= 8,
        });
    }, [formData.password]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const isFormValid =
        formData.firstName &&
        formData.lastName &&
        formData.email &&
        Object.values(passwordReqs).every(Boolean);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isFormValid) {
            updateData(formData);
            router.push('/signup/preferences');
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.backButtonWrapper}>
                <Link href="/" className={styles.backButton}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Go back
                </Link>
            </div>

            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Let&apos;s get started</h1>
                    <p className={styles.subtitle}>
                        At vero eos et accusamus et iusto odio dignissimos ducimus qui.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.formGrid}>
                    <div className={styles.row}>
                        <Input
                            placeholder="First name *"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            placeholder="Last name *"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <Input
                        placeholder="Email address *"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        placeholder="Password *"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <div className={styles.passwordRequirements}>
                        <div className={styles.reqList}>
                            <Requirement met={passwordReqs.lowercase} label="Lowercase characters." />
                            <Requirement met={passwordReqs.uppercase} label="Uppercase characters." />
                            <Requirement met={passwordReqs.number} label="Numbers" />
                            <Requirement met={passwordReqs.length} label="8 characters minimum." />
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <Button type="submit" fullWidth disabled={!isFormValid}>
                            Create account
                        </Button>
                    </div>

                    <div className={styles.loginLink}>
                        Already have an account?{' '}
                        <Link href="/login" className={styles.link}>
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>

            <div className={styles.footer}>
                <span className={styles.footerLink}>Copyright ©2025</span>
                <span className={styles.footerLink}>Term of service</span>
            </div>
        </div>
    );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
    return (
        <div className={`${styles.reqItem} ${met ? styles.met : ''}`}>
            <div className={styles.reqDot}></div>
            <div className={styles.checkIcon}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <span>{label}</span>
        </div>
    );
}
