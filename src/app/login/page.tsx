"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignup } from '@/context/SignupContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import styles from '../signup/signup.module.css';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useSignup();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(''); // Clear error when user types
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const success = await login(formData.email, formData.password);

        if (success) {
            router.push('/dashboard');
        } else {
            setError('Invalid email or password. Please try again.');
            setIsLoading(false);
        }
    };

    const isFormValid = formData.email && formData.password;

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
                    <h1 className={styles.title}>Welcome back</h1>
                    <p className={styles.subtitle}>
                        Sign in to continue managing your support planning.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.formGrid}>
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

                    {error && (
                        <div className={styles.errorMessage}>
                            {error}
                        </div>
                    )}

                    <div className={styles.actions}>
                        <Button type="submit" fullWidth disabled={!isFormValid || isLoading}>
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </div>

                    <div className={styles.loginLink}>
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className={styles.link}>
                            Create account
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
