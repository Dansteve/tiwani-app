"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the form data
export interface ChildDetails {
    id: string;
    firstName: string;
    lastName: string;
    ageRange: string;
    supportNeeds: string;
}

interface SignupData {
    // Step 1: Sign up
    firstName: string;
    lastName: string;
    email: string;
    password: string;

    // Step 2: Preferences (Selected chapters)
    selectedChapters: string[];

    // Step 3: Continuity (Status of selected chapters)
    chapterStatuses: Record<string, string>; // e.g. { "Social & community": "Going well" }

    // Step 4: Planning (Children)
    children: ChildDetails[];

    // Usage statistics
    loginCount: number; // Number of times user has logged in
    statusUpdateCount: number; // Number of times user has updated chapter statuses
    preparationReuseCount: number; // Number of times preparation assets have been reused
    
    // Selected triggers per chapter and participation level
    // Format: { "chapter:participationLevel": [{ trigger: string, impact: string, isCustom: boolean }] }
    selectedTriggers: Record<string, Array<{ trigger: string; impact: string; isCustom: boolean }>>;
}

interface SignupContextType {
    currentStep: number;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>; // Exposed
    userData: SignupData;
    setUserData: React.Dispatch<React.SetStateAction<SignupData>>;
    goToNextStep: () => void;
    goToPreviousStep: () => void;
    updateData: (fields: Partial<SignupData>) => void;
    updateProfile: (firstName: string, lastName: string) => void;
    updateChapterStatus: (chapter: string, status: string) => void;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    deleteAccount: () => Promise<boolean>;
    isAuthenticated: boolean;
}

const SignupContext = createContext<SignupContextType | undefined>(undefined);

const initialData: SignupData = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    selectedChapters: [],
    chapterStatuses: {},
    children: [],
    loginCount: 0,
    statusUpdateCount: 0,
    preparationReuseCount: 0,
    selectedTriggers: {}
};

// Map step numbers to URLs for cleaner routing reference if needed, 
// though we usually control this via the page wrapper or layout.
// For now, simple index tracking.

export function SignupProvider({ children }: { children: ReactNode }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [userData, setUserData] = useState<SignupData>(initialData);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Initialize DB and load data
    React.useEffect(() => {
        const initDB = async () => {
            // Check if IndexedDB is available (Safari private mode blocks it)
            if (typeof window === 'undefined' || !window.indexedDB) {
                console.warn('IndexedDB not available, using sessionStorage fallback');
                setIsLoaded(true);
                return;
            }

            try {
                const request = indexedDB.open('TiwaniDB', 1);

                request.onerror = (event) => {
                    console.error('IndexedDB error:', event);
                    // Fallback to sessionStorage if IndexedDB fails
                    const storedEmail = sessionStorage.getItem('tiwani_user_email');
                    if (storedEmail) {
                        const storedData = sessionStorage.getItem('tiwani_user_data');
                        if (storedData) {
                            try {
                                const parsedData = JSON.parse(storedData);
                                // Ensure selectedTriggers exists for backward compatibility
                                const userData = {
                                    ...initialData,
                                    ...parsedData,
                                    selectedTriggers: parsedData.selectedTriggers || {}
                                };
                                setUserData(userData);
                                setIsAuthenticated(true);
                            } catch (e) {
                                console.error('Failed to parse stored data:', e);
                            }
                        }
                    }
                    setIsLoaded(true);
                };

                request.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;

                    // Create object store if it doesn't exist
                    if (!db.objectStoreNames.contains('users')) {
                        db.createObjectStore('users', { keyPath: 'email' });
                    }
                };

                request.onsuccess = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;

                    // Handle database errors
                    db.onerror = (event) => {
                        console.error('Database error:', event);
                    };

                    const storedEmail = sessionStorage.getItem('tiwani_user_email');
                    if (storedEmail) {
                        try {
                            const transaction = db.transaction(['users'], 'readonly');
                            const store = transaction.objectStore('users');
                            const getRequest = store.get(storedEmail);

                            getRequest.onsuccess = () => {
                                if (getRequest.result) {
                                    // Ensure selectedTriggers exists for backward compatibility
                                    const userData = {
                                        ...initialData,
                                        ...getRequest.result,
                                        selectedTriggers: getRequest.result.selectedTriggers || {}
                                    };
                                    setUserData(userData);
                                    setIsAuthenticated(true);
                                    // Also store in sessionStorage as backup
                                    sessionStorage.setItem('tiwani_user_data', JSON.stringify(userData));
                                }
                                setIsLoaded(true);
                            };

                            getRequest.onerror = () => {
                                console.error('Failed to load user data');
                                setIsLoaded(true);
                            };
                        } catch (error) {
                            console.error('Transaction error:', error);
                            setIsLoaded(true);
                        }
                    } else {
                        setIsLoaded(true);
                    }
                };
            } catch (error) {
                console.error('Failed to initialize IndexedDB:', error);
                setIsLoaded(true);
            }
        };

        initDB();
    }, []);

    // Save changes to DB whenever userData changes
    React.useEffect(() => {
        if (!isLoaded || !userData.email) return;

        // Always save to sessionStorage as backup
        try {
            sessionStorage.setItem('tiwani_user_data', JSON.stringify(userData));
            sessionStorage.setItem('tiwani_user_email', userData.email);
        } catch (e) {
            console.error('Failed to save to sessionStorage:', e);
        }

        // Try to save to IndexedDB
        if (typeof window !== 'undefined' && window.indexedDB) {
            try {
                const request = indexedDB.open('TiwaniDB', 1);

                request.onsuccess = (event) => {
                    try {
                        const db = (event.target as IDBOpenDBRequest).result;
                        const transaction = db.transaction(['users'], 'readwrite');
                        const store = transaction.objectStore('users');
                        store.put(userData);
                    } catch (error) {
                        console.error('Failed to save to IndexedDB:', error);
                    }
                };

                request.onerror = () => {
                    console.error('IndexedDB request failed');
                };
            } catch (error) {
                console.error('Failed to open IndexedDB:', error);
            }
        }
    }, [userData, isLoaded]);

    const goToNextStep = () => setCurrentStep(prev => prev + 1);
    const goToPreviousStep = () => setCurrentStep(prev => Math.max(1, prev - 1));

    const updateData = (fields: Partial<SignupData>) => {
        setUserData(prev => ({ ...prev, ...fields }));
    };

    const updateProfile = (firstName: string, lastName: string) => {
        setUserData(prev => ({ ...prev, firstName, lastName }));
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const request = indexedDB.open('TiwaniDB', 1);

            request.onsuccess = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const transaction = db.transaction(['users'], 'readonly');
                const store = transaction.objectStore('users');
                const getRequest = store.get(email);

                getRequest.onsuccess = () => {
                    const user = getRequest.result;

                    if (user && user.password === password) {
                        // Increment login count
                        const updatedUser = {
                            ...user,
                            loginCount: (user.loginCount || 0) + 1,
                            statusUpdateCount: user.statusUpdateCount || 0, // Ensure it exists
                            preparationReuseCount: user.preparationReuseCount || 0 // Ensure it exists
                        };
                        setUserData(updatedUser);
                        setIsAuthenticated(true);
                        sessionStorage.setItem('tiwani_user_email', email);
                        sessionStorage.setItem('tiwani_user_data', JSON.stringify(updatedUser));

                        // Save updated login count to IndexedDB
                        try {
                            const updateTransaction = db.transaction(['users'], 'readwrite');
                            const updateStore = updateTransaction.objectStore('users');
                            updateStore.put(updatedUser);
                        } catch (error) {
                            console.error('Failed to update login count:', error);
                        }

                        resolve(true);
                    } else {
                        resolve(false);
                    }
                };

                getRequest.onerror = () => {
                    resolve(false);
                };
            };

            request.onerror = () => {
                resolve(false);
            };
        });
    };

    const updateChapterStatus = (chapter: string, status: string) => {
        setUserData(prev => ({
            ...prev,
            chapterStatuses: {
                ...prev.chapterStatuses,
                [chapter]: status
            },
            statusUpdateCount: (prev.statusUpdateCount || 0) + 1
        }));
    };

    const logout = () => {
        // Don't clear userData - keep it in IndexedDB for when user logs back in
        setIsAuthenticated(false);
        sessionStorage.removeItem('tiwani_user_email');
        // Keep user_data in sessionStorage so it can be restored on next login
        // The data remains in IndexedDB and will be loaded on next login
    };

    const deleteAccount = async (): Promise<boolean> => {
        return new Promise((resolve) => {
            const email = userData.email;

            if (!email) {
                resolve(false);
                return;
            }

            // Remove from sessionStorage
            sessionStorage.removeItem('tiwani_user_email');
            sessionStorage.removeItem('tiwani_user_data');

            // Remove from IndexedDB
            if (typeof window !== 'undefined' && window.indexedDB) {
                try {
                    const request = indexedDB.open('TiwaniDB', 1);

                    request.onsuccess = (event) => {
                        try {
                            const db = (event.target as IDBOpenDBRequest).result;
                            const transaction = db.transaction(['users'], 'readwrite');
                            const store = transaction.objectStore('users');
                            const deleteRequest = store.delete(email);

                            deleteRequest.onsuccess = () => {
                                // Clear user data and authentication
                                setUserData(initialData);
                                setIsAuthenticated(false);
                                resolve(true);
                            };

                            deleteRequest.onerror = () => {
                                console.error('Failed to delete account from IndexedDB');
                                resolve(false);
                            };
                        } catch (error) {
                            console.error('Transaction error:', error);
                            resolve(false);
                        }
                    };

                    request.onerror = () => {
                        console.error('IndexedDB request failed');
                        resolve(false);
                    };
                } catch (error) {
                    console.error('Failed to open IndexedDB:', error);
                    resolve(false);
                }
            } else {
                // If IndexedDB not available, just clear state
                setUserData(initialData);
                setIsAuthenticated(false);
                resolve(true);
            }
        });
    };

    return (
        <SignupContext.Provider value={{
            currentStep,
            setCurrentStep,
            userData,
            setUserData,
            goToNextStep,
            goToPreviousStep,
            updateData,
            updateProfile,
            updateChapterStatus,
            login,
            logout,
            deleteAccount,
            isAuthenticated
        }}>
            {children}
        </SignupContext.Provider>
    );
}

export function useSignup() {
    const context = useContext(SignupContext);
    if (context === undefined) {
        throw new Error('useSignup must be used within a SignupProvider');
    }
    return context;
}
