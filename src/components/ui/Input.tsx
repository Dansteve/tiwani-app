"use client";

import React, { InputHTMLAttributes, useState } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = ({
    label,
    error,
    type = 'text',
    className = '',
    required,
    ...props
}: InputProps) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className={`${styles.wrapper} ${className}`}>
            {label && (
                <label className={styles.label}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </label>
            )}

            <div className={styles.inputContainer}>
                <input
                    type={inputType}
                    className={`${styles.input} ${error ? styles.error : ''}`}
                    required={required}
                    {...props}
                />

                {isPassword && (
                    <button
                        type="button"
                        className={styles.toggleButton}
                        onClick={togglePassword}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? (
                            // Simple Eye Off Icon
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                        ) : (
                            // Simple Eye Icon
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        )}
                    </button>
                )}
            </div>

            {error && <span className={styles.errorMessage}>{error}</span>}
        </div>
    );
};
