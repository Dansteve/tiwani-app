"use client";

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import styles from './PrepareSupportModal.module.css';

type ParticipationLevel = "observe" | "partial" | "participate";

type VariabilityPrompt = {
  trigger: string;
  impact: string;
};

interface PrepareSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: string;
  participationLevel: ParticipationLevel;
  prompts: VariabilityPrompt[];
  onReuse?: () => void; // Callback to track preparation reuse
}

type ActionType = 'reuse' | 'review' | 'create';

export default function PrepareSupportModal({
  isOpen,
  onClose,
  chapter,
  participationLevel,
  prompts,
  onReuse
}: PrepareSupportModalProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<VariabilityPrompt | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);

  const handlePromptSelect = (prompt: VariabilityPrompt) => {
    setSelectedPrompt(prompt);
    setActionType(null);
  };

  const handleAction = (action: ActionType, prompt: VariabilityPrompt) => {
    setSelectedPrompt(prompt);
    setActionType(action);
    
    // Track preparation reuse
    if (action === 'reuse' && onReuse) {
      onReuse();
    }
    
    // TODO: Implement actual action logic
    switch (action) {
      case 'reuse':
        console.log('Reusing preparation assets for:', prompt.trigger);
        // Navigate to reusable assets or show list
        break;
      case 'review':
        console.log('Reviewing preparation assets for:', prompt.trigger);
        // Show existing assets for review
        break;
      case 'create':
        console.log('Creating new preparation assets for:', prompt.trigger);
        // Open creation flow
        break;
    }
  };

  const handleClose = () => {
    setSelectedPrompt(null);
    setActionType(null);
    onClose();
  };

  const participationLevelLabels: Record<ParticipationLevel, string> = {
    observe: 'Stay nearby',
    partial: 'Join briefly',
    participate: 'Join with support'
  };

  if (prompts.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Prepare Support">
        <div className={styles.container}>
          <p className={styles.emptyMessage}>
            No prompts available for {chapter} at {participationLevelLabels[participationLevel]} level.
          </p>
          <div className={styles.actions}>
            <Button onClick={handleClose}>Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Prepare Support">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.chapterInfo}>
            <span className={styles.chapterName}>{chapter}</span>
            <span className={styles.participationLevel}>
              {participationLevelLabels[participationLevel]}
            </span>
          </div>
        </div>

        <div className={styles.promptsSection}>
          <h3 className={styles.sectionTitle}>Select a predictable change to prepare for:</h3>
          
          <div className={styles.promptsList}>
            {prompts.map((prompt, index) => (
              <div
                key={index}
                className={`${styles.promptCard} ${selectedPrompt === prompt ? styles.selected : ''}`}
                onClick={() => handlePromptSelect(prompt)}
              >
                <div className={styles.promptContent}>
                  <div className={styles.promptTrigger}>{prompt.trigger}</div>
                  <div className={styles.promptImpact}>{prompt.impact}</div>
                </div>
                
                {selectedPrompt === prompt && (
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction('reuse', prompt);
                      }}
                    >
                      Reuse
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction('review', prompt);
                      }}
                    >
                      Review
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction('create', prompt);
                      }}
                    >
                      Create
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedPrompt && actionType && (
          <div className={styles.actionFeedback}>
            <p>
              {actionType === 'reuse' && `Reusing preparation assets for: ${selectedPrompt.trigger}`}
              {actionType === 'review' && `Reviewing preparation assets for: ${selectedPrompt.trigger}`}
              {actionType === 'create' && `Creating new preparation assets for: ${selectedPrompt.trigger}`}
            </p>
            <p className={styles.actionNote}>
              {actionType === 'reuse' && 'This will show you reusable preparation materials that can be used again for similar situations.'}
              {actionType === 'review' && 'This will show you existing preparation assets to review and update if needed.'}
              {actionType === 'create' && 'This will help you create new preparation assets (images, audio, visuals, or short narratives) for this situation.'}
            </p>
          </div>
        )}

        <div className={styles.footerActions}>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

