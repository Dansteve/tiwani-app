import React from 'react';
import styles from './LoadingOverlay.module.css';

interface LoadingOverlayProps {
    isVisible: boolean;
    opacity?: number;
    color?: string; // Background color base, default is black
    title?: string;
    description?: string;
}

export const LoadingOverlay = ({
    isVisible,
    opacity = 0.5,
    color = 'black',
    title = 'Preparing Tiwani...',
    description = 'Keep calm and carry on'
}: LoadingOverlayProps) => {
    if (!isVisible) return null;

    return (
        <div
            className={styles.overlay}
            style={{
                backgroundColor: color,
                opacity: opacity,
            }}
        >
            {/* Background Layer (if needed for separate opacity logic, but keeping simple for now based on previous complexity discussion) */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: color,
                    opacity: opacity,
                }}
            />

            {/* Content Layer - Opaque */}
            <div className={styles.contentContainer}>
                <div className={styles.titleRow}>
                    <div className={styles.spinner}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                        </svg>
                    </div>
                    <h3 className={styles.title}>{title}</h3>
                </div>
                <p className={styles.description}>{description}</p>
            </div>
        </div>
    );
};
