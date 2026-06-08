"use client";

import React, { createContext, useContext, useState } from 'react';

export const TABS = [
    { id: 'life', label: 'Life chapter' },
    { id: 'children', label: 'Child details' },
    { id: 'profile', label: 'My profile' },
];

type TabId = string;

interface DashboardContextType {
    activeTab: TabId;
    setActiveTab: (id: TabId) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const [activeTab, setActiveTab] = useState<TabId>(TABS[0].id);

    return (
        <DashboardContext.Provider value={{ activeTab, setActiveTab }}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}
