import React, { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'social' | 'outline' | 'ghost';
    fullWidth?: boolean;
    icon?: React.ReactNode;
    loading?: boolean;
}

export const Button = ({
    children,
    className = '',
    variant = 'primary',
    fullWidth = false,
    icon,
    loading,
    disabled,
    ...props
}: ButtonProps) => {
    const variantClass = styles[variant];
    const widthClass = fullWidth ? styles.fullWidth : '';
    const loadingClass = loading ? styles.loading : '';

    return (
        <button
            className={`${styles.button} ${variantClass} ${widthClass} ${loadingClass} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span style={{ marginRight: '8px' }}>...</span> // Simple loading indicator
            ) : icon ? (
                <span className={styles.icon}>{icon}</span>
            ) : null}
            <span className={styles.label}>{children}</span>
        </button>
    );
};
