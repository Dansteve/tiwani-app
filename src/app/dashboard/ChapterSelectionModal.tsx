import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import styles from './ChapterSelectionModal.module.css';

interface ChapterSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSelectedChapters: string[];
    initialStatuses: Record<string, string>;
    onSave: (chapters: string[], statuses: Record<string, string>) => void;
}

const AVAILABLE_CHAPTERS = [
    'Social & community',
    'Career',
    'Travel & holidays',
    'Culture & faith',
    'Family life & routines'
];

export const STATUS_OPTIONS = [
    { value: 'going_well', label: 'On track', desc: 'Life is continuing as planned' },
    { value: 'needs_support', label: 'Continuing with support', desc: 'Making it work with adjustments' },
    { value: 'struggling', label: 'Becoming difficult', desc: "It's getting harder to maintain" },
    { value: 'pause', label: 'On hold for now', desc: 'This part of life is paused for now, you can return to it anytime' }
];

export default function ChapterSelectionModal({
    isOpen,
    onClose,
    initialSelectedChapters,
    initialStatuses,
    onSave
}: ChapterSelectionModalProps) {
    const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
    const [statuses, setStatuses] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                setSelectedChapters(initialSelectedChapters);
                setStatuses(initialStatuses);
            }, 0);
        }
    }, [isOpen, initialSelectedChapters, initialStatuses]);

    const handleToggleChapter = (chapter: string) => {
        if (selectedChapters.includes(chapter)) {
            setSelectedChapters(prev => prev.filter(c => c !== chapter));
            // Optional: remove status if deselected? Keeping it might be fine.
        } else {
            setSelectedChapters(prev => [...prev, chapter]);
            // Default status if not set
            if (!statuses[chapter]) {
                setStatuses(prev => ({ ...prev, [chapter]: 'going_well' }));
            }
        }
    };

    const handleStatusChange = (chapter: string, status: string) => {
        setStatuses(prev => ({ ...prev, [chapter]: status }));
    };

    const handleSave = () => {
        onSave(selectedChapters, statuses);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Life Chapters">
            <div className={styles.container}>
                <p className={styles.description}>
                    Select the areas of life you want to track and set their current status.
                </p>

                <div className={styles.chapterList}>
                    {AVAILABLE_CHAPTERS.map(chapter => {
                        const isSelected = selectedChapters.includes(chapter);
                        return (
                            <div key={chapter} className={`${styles.chapterItem} ${isSelected ? styles.selected : ''}`}>
                                <div className={styles.chapterHeader}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleChapter(chapter)}
                                            className={styles.checkbox}
                                        />
                                        <span className={styles.chapterName}>{chapter}</span>
                                    </label>
                                </div>

                                {isSelected && (
                                    <div className={styles.statusSelector}>
                                        <label className={styles.statusLabel}>Current Status:</label>
                                        <select
                                            title="Current Status"
                                            value={statuses[chapter] || 'going_well'}
                                            onChange={(e) => handleStatusChange(chapter, e.target.value)}
                                            className={styles.select}
                                        >
                                            {STATUS_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className={styles.actions}>
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={handleSave}>Save Changes</Button>
                </div>
            </div>
        </Modal>
    );
}
