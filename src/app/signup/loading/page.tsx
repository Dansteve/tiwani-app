"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

export default function LoadingPage() {
    const router = useRouter();
    const [mounted, setMounted] = React.useState(false);

    useEffect(() => {
        setMounted(true);
        // Simulate data processing delay
        const timer = setTimeout(() => {
            router.push('/dashboard');
        }, 3000);

        return () => clearTimeout(timer);
    }, [router]);

    if (!mounted) return null;

    return (
        <div style={{ height: '100vh', position: 'relative' }}>
            {/* Uses the reusable overlay. Opacity 1 mostly hides the background, or typical overlay feel. */}
            <LoadingOverlay isVisible={true} opacity={1} color="white" />
        </div>
    );
}
