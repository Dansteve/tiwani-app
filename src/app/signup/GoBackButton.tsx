"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import styles from './signup.module.css';

export const GoBackButton = () => {
    const router = useRouter();

    return (
        <div className={styles.backButton}>
            <Button
                variant="ghost"
                onClick={() => router.back()}
                style={{
                    backgroundColor: 'white',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)'
                }}
                icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                }
            >
                Go back
            </Button>
        </div>
    );
};
