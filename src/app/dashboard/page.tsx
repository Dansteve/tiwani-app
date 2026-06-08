"use client";

import React, { useState } from 'react';
import { useSignup, ChildDetails } from '@/context/SignupContext';
import styles from './dashboard.module.css';
import { useDashboard, TABS } from './DashboardContext';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import ChapterSelectionModal, { STATUS_OPTIONS } from './ChapterSelectionModal';
import PrepareSupportModal from './PrepareSupportModal';

// --- Constants for Mapping Logic ---

type ParticipationLevel = "observe" | "partial" | "participate";

type VariabilityPrompt = {
  trigger: string;  // what may change
  impact: string;   // why it matters
};

const PREDICTABLE_VARIABILITY_MAP: Record<
  string,
  Record<ParticipationLevel, VariabilityPrompt[]>
> = {
  "Social & community": {
    observe: [
      { trigger: "Noise level increases", impact: "Sensory load rises quickly" },
      { trigger: "Unexpected waiting", impact: "Uncertainty builds" },
    ],
    partial: [
      { trigger: "New people join", impact: "Social demand increases" },
      { trigger: "Change of activity", impact: "Transition friction" },
    ],
    participate: [
      { trigger: "Crowd density changes", impact: "Less predictability and more sensory input" },
    ],
  },

  "Career": {
    observe: [
      { trigger: "Meeting runs longer than planned", impact: "Time pressure increases" },
      { trigger: "Unclear expectations", impact: "Uncertainty and stress increase" },
    ],
    partial: [
      { trigger: "Last-minute changes", impact: "Harder to prepare and stay regulated" },
      { trigger: "New people present", impact: "Higher social demand" },
    ],
    participate: [
      { trigger: "Performance moment (questions/feedback)", impact: "Pressure spikes" },
    ],
  },

  "Travel & holidays": {
    observe: [
      { trigger: "Waiting / delays", impact: "Uncertainty builds fast" },
      { trigger: "Loud announcements", impact: "Sensory overload risk" },
    ],
    partial: [
      { trigger: "New environment layout", impact: "Harder to orient and predict" },
      { trigger: "Queue movement changes", impact: "Transition friction" },
    ],
    participate: [
      { trigger: "Security/staff interactions", impact: "High social + sensory demand" },
    ],
  },

  "Culture & faith": {
    observe: [
      { trigger: "Sound level changes", impact: "Sensory load fluctuates" },
      { trigger: "Long duration", impact: "Fatigue increases" },
    ],
    partial: [
      { trigger: "Crowd size changes", impact: "Less predictability" },
      { trigger: "Unexpected touch/proximity", impact: "Boundary stress" },
    ],
    participate: [
      { trigger: "Standing/sitting transitions", impact: "More regulation and transitions" },
    ],
  },

  "Family life & routines": {
    observe: [
      { trigger: "Routine timing changes", impact: "Increases anxiety" },
      { trigger: "Unexpected stop (errand/appointment)", impact: "Harder to prepare" },
    ],
    partial: [
      { trigger: "Environment is busy (shop/clinic)", impact: "Sensory navigation demand" },
      { trigger: "Waiting", impact: "Uncertainty and frustration" },
    ],
    participate: [
      { trigger: "Plan changes mid-way", impact: "High transition + uncertainty load" },
    ],
  },
};

const NEXT_STEP_DATA: Record<string, { text: string; buttonText: string }> = {
    'Social & community': { text: 'Review predictable change: Noise level', buttonText: 'Prepare support' },
    'Career': { text: 'Prepare for afternoon meeting', buttonText: 'Review notes' },
    'Travel & holiday': { text: 'Check packing list for upcoming trip', buttonText: 'Review items' },
    'Culture & faith': { text: 'Plan for community gathering', buttonText: 'Set reminder' },
    'Family life & routines': { text: 'Prepare for grocery store trip', buttonText: 'Check list' }
};

const DEFAULT_NEXT_STEP = { text: 'Review upcoming changes', buttonText: 'View details' };

export default function DashboardPage() {
    const { userData, setUserData } = useSignup(); // Need setUserData to update children
    const { activeTab, setActiveTab } = useDashboard();

    // Default to first selected chapter or a fallback
    // Note: Using 'Social & community' as default, but handle any existing 'Travel & holiday' entries
    const defaultChapter = userData.selectedChapters[0] || 'Social & community';
    const [currentChapter, setCurrentChapter] = useState(defaultChapter);
    const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
    const [isPrepareSupportModalOpen, setIsPrepareSupportModalOpen] = useState(false);
    
    // Participation level state
    const [participationLevel, setParticipationLevel] = useState<ParticipationLevel>("observe");
    
    // Trigger selection state
    const [showTriggerSelector, setShowTriggerSelector] = useState(false);
    const [customTriggerInput, setCustomTriggerInput] = useState("");
    const [customImpactInput, setCustomImpactInput] = useState("");
    
    // Reset trigger selector when chapter or participation level changes
    React.useEffect(() => {
        setShowTriggerSelector(false);
        setCustomTriggerInput("");
        setCustomImpactInput("");
    }, [currentChapter, participationLevel]);

    // Update current chapter if selected chapters change and current is no longer valid
    React.useEffect(() => {
        if (!userData.selectedChapters.includes(currentChapter) && userData.selectedChapters.length > 0) {
            setCurrentChapter(userData.selectedChapters[0]);
        }
    }, [userData.selectedChapters, currentChapter]);

    // Child Management State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChild, setEditingChild] = useState<ChildDetails | null>(null);
    const [formData, setFormData] = useState<Omit<ChildDetails, 'id'>>({
        firstName: '',
        lastName: '',
        ageRange: '',
        supportNeeds: ''
    });

    // Profile Editing State
    const [profileFormData, setProfileFormData] = useState({
        firstName: userData.firstName,
        lastName: userData.lastName
    });

    // Update profile local state when userData loads
    React.useEffect(() => {
        setProfileFormData({
            firstName: userData.firstName,
            lastName: userData.lastName
        });
    }, [userData.firstName, userData.lastName]);

    const { updateProfile } = useSignup();

    const currentStatusId = userData.chapterStatuses[currentChapter] || 'going_well';
    const currentStatusOption = STATUS_OPTIONS.find(opt => opt.value === currentStatusId) || STATUS_OPTIONS[0];

    const handleChapterSave = (chapters: string[], statuses: Record<string, string>) => {
        // Check if any statuses have changed to track updates
        const previousStatuses = userData.chapterStatuses;
        let hasStatusChange = false;
        
        // Check if any status changed
        Object.keys(statuses).forEach(chapter => {
            if (previousStatuses[chapter] !== statuses[chapter]) {
                hasStatusChange = true;
            }
        });
        
        setUserData(prev => ({
            ...prev,
            selectedChapters: chapters,
            chapterStatuses: { ...prev.chapterStatuses, ...statuses },
            statusUpdateCount: hasStatusChange ? (prev.statusUpdateCount || 0) + 1 : prev.statusUpdateCount || 0
        }));
    };

    // Child Handlers
    const handleEditClick = (child: ChildDetails) => {
        setEditingChild(child);
        setFormData({
            firstName: child.firstName,
            lastName: child.lastName,
            ageRange: child.ageRange,
            supportNeeds: child.supportNeeds || ''
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        if (confirm('Are you sure you want to delete this child?')) {
            const updatedChildren = userData.children.filter(c => c.id !== id);
            setUserData(prev => ({ ...prev, children: updatedChildren }));
        }
    };

    const handleModalSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingChild) {
            // Update existing
            const updatedChildren = userData.children.map(c =>
                c.id === editingChild.id ? { ...c, ...formData } : c
            );
            setUserData(prev => ({ ...prev, children: updatedChildren }));
        } else {
            // Add new
            const newChild: ChildDetails = {
                id: Date.now().toString(), // Simple ID generation
                ...formData
            };
            setUserData(prev => ({ ...prev, children: [...prev.children, newChild] }));
        }
        setIsModalOpen(false);
    };

    return (
        <div>
            {/* Tabs - Hidden on mobile via CSS */}
            <div className={styles.tabPills}>
                {TABS.map(tab => (
                    <div
                        key={tab.id}
                        className={`${styles.pill} ${activeTab === tab.id ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </div>
                ))}
                {/* <div className={styles.deleteAccount}>Delete account</div> */}
            </div>

            {/* Content based on Tab */}
            {activeTab === 'life' && (
                <div className={`animate-fade-in ${styles.tabContentWrapper}`}>
                    {/* Life Chapter Dashboard */}

                    {/* Chapter Selector */}
                    <div className={styles.chapterSelector}>
                        {/* If multiple chapters, maybe dropdown or just show current and Change opens modal */}
                        <div className={styles.currentChapter}>
                            {userData.selectedChapters.length > 0 ? (
                                <select
                                    className={styles.chapterDropdown}
                                    value={currentChapter}
                                    onChange={(e) => setCurrentChapter(e.target.value)}
                                >
                                    {userData.selectedChapters.map(ch => (
                                        <option key={ch} value={ch}>{ch}</option>
                                    ))}
                                </select>
                            ) : (
                                <span>No active chapters</span>
                            )}
                        </div>
                        <div className={styles.changeButton} onClick={() => setIsChapterModalOpen(true)}>
                            Change
                        </div>
                    </div>

                    {/* Status Section */}
                    <div className={styles.dashboardSection}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionLabel}>Status</span>
                        </div>
                        <div className={`${styles.card} ${styles.statusCard}`}>
                            <div className={styles.statusContent}>
                                <div>
                                    <div className={styles.statusTitle}>{currentStatusOption.label}</div>
                                    <div className={styles.statusDesc}>{currentStatusOption.desc}</div>
                                </div>
                                <button 
                                    className={styles.updateStatusButton}
                                    onClick={() => setIsChapterModalOpen(true)}
                                >
                                    Update status
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Next Step Section */}
                    <div className={styles.dashboardSection}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionLabel}>Next Step</span>
                        </div>
                        <div className={`${styles.card} ${styles.nextStepCard}`}>
                            {(() => {
                                const nextStep = NEXT_STEP_DATA[currentChapter] || DEFAULT_NEXT_STEP;
                                return (
                                    <div className={styles.nextStepContent}>
                                        <div>
                                            {nextStep.text.includes(':') ? (
                                                <>
                                                    {nextStep.text.split(':')[0].trim()} : <br></br>{nextStep.text.split(':')[1]?.trim() || ''}
                                                </>
                                            ) : (
                                                nextStep.text
                                            )}
                                        </div>
                                        <button 
                                            className={styles.prepareButton}
                                            onClick={() => setIsPrepareSupportModalOpen(true)}
                                        >
                                            {nextStep.buttonText}
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Predictable Variability Section */}
                    <div className={styles.dashboardSection}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionLabel}>Predictable variability</span>
                        </div>
                        
                        {/* Participation Level Selector */}
                        <div className={styles.participationSelector}>
                            <div className={styles.participationSelectorContent}>
                                <div className={styles.participationSelectorLeft}>
                                    <label className={styles.participationLabel}>What feels manageable today?</label>
                                    <div className={styles.participationButtons}>
                                        <button
                                            className={`${styles.participationButton} ${participationLevel === 'observe' ? styles.active : ''}`}
                                            onClick={() => setParticipationLevel('observe')}
                                        >
                                            Stay nearby
                                        </button>
                                        <button
                                            className={`${styles.participationButton} ${participationLevel === 'partial' ? styles.active : ''}`}
                                            onClick={() => setParticipationLevel('partial')}
                                        >
                                            Join briefly
                                        </button>
                                        <button
                                            className={`${styles.participationButton} ${participationLevel === 'participate' ? styles.active : ''}`}
                                            onClick={() => setParticipationLevel('participate')}
                                        >
                                            Join with support
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Trigger Selection UI */}
                                {!showTriggerSelector && (
                                    <div className={styles.triggerSelectorButton}>
                                        <button 
                                            className={styles.selectTriggerButton}
                                            onClick={() => setShowTriggerSelector(true)}
                                        >
                                            Select what might change
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Trigger Selector (when open) */}
                        {showTriggerSelector && (
                            <div className={styles.triggerSelector}>
                                <div className={styles.triggerSelectorHeader}>
                                    <h3>Select what might change</h3>
                                    <button 
                                        className={styles.closeTriggerSelector}
                                        onClick={() => setShowTriggerSelector(false)}
                                    >
                                        Done
                                    </button>
                                </div>
                                
                                {/* Suggested Triggers */}
                                {(() => {
                                    const chapterKey = currentChapter === 'Travel & holiday' ? 'Travel & holidays' : currentChapter;
                                    const suggestedPrompts = PREDICTABLE_VARIABILITY_MAP[chapterKey]?.[participationLevel] || [];
                                    const triggerKey = `${currentChapter}:${participationLevel}`;
                                    const selectedTriggers = (userData.selectedTriggers || {})[triggerKey] || [];
                                    
                                    return (
                                        <div className={styles.suggestedTriggers}>
                                            <h4>Suggestions for {currentChapter}</h4>
                                            {suggestedPrompts.length === 0 ? (
                                                <p className={styles.noSuggestions}>No suggestions available for this combination.</p>
                                            ) : (
                                                <div className={styles.suggestedTriggersList}>
                                                    {suggestedPrompts.map((prompt, index) => {
                                                        const isSelected = selectedTriggers.some(
                                                            t => t.trigger === prompt.trigger && t.impact === prompt.impact
                                                        );
                                                        return (
                                                            <div 
                                                                key={index} 
                                                                className={`${styles.suggestedTriggerItem} ${isSelected ? styles.selected : ''}`}
                                                                onClick={() => {
                                                                    const triggerKey = `${currentChapter}:${participationLevel}`;
                                                                    const currentSelected = (userData.selectedTriggers || {})[triggerKey] || [];
                                                                    
                                                                    if (isSelected) {
                                                                        // Remove
                                                                        setUserData(prev => ({
                                                                            ...prev,
                                                                            selectedTriggers: {
                                                                                ...(prev.selectedTriggers || {}),
                                                                                [triggerKey]: currentSelected.filter(
                                                                                    t => !(t.trigger === prompt.trigger && t.impact === prompt.impact)
                                                                                )
                                                                            }
                                                                        }));
                                                                    } else {
                                                                        // Add
                                                                        setUserData(prev => ({
                                                                            ...prev,
                                                                            selectedTriggers: {
                                                                                ...(prev.selectedTriggers || {}),
                                                                                [triggerKey]: [...currentSelected, { ...prompt, isCustom: false }]
                                                                            }
                                                                        }));
                                                                    }
                                                                }}
                                                            >
                                                                <div className={styles.suggestedTriggerText}>
                                                                    <strong>{prompt.trigger}</strong>
                                                                    <span>{prompt.impact}</span>
                                                                </div>
                                                                {isSelected && <span className={styles.checkmark}>✓</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                
                                {/* Custom Trigger Input */}
                                <div className={styles.customTriggerSection}>
                                    <h4>Add another possible change for {currentChapter}</h4>
                                    <div className={styles.customTriggerInputs}>
                                        <input
                                            type="text"
                                            placeholder="What may change? (e.g., Noise level increases)"
                                            value={customTriggerInput}
                                            onChange={(e) => setCustomTriggerInput(e.target.value)}
                                            className={styles.customInput}
                                            title="Enter a possible change - what may change"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Why it matters? (e.g., Sensory load rises quickly)"
                                            value={customImpactInput}
                                            onChange={(e) => setCustomImpactInput(e.target.value)}
                                            className={styles.customInput}
                                            title="Enter the impact - why this change matters"
                                        />
                                        <button
                                            className={styles.addCustomTriggerButton}
                                            onClick={() => {
                                                if (customTriggerInput.trim() && customImpactInput.trim()) {
                                                    const triggerKey = `${currentChapter}:${participationLevel}`;
                                                    const currentSelected = (userData.selectedTriggers || {})[triggerKey] || [];
                                                    
                                                    setUserData(prev => ({
                                                        ...prev,
                                                        selectedTriggers: {
                                                            ...(prev.selectedTriggers || {}),
                                                            [triggerKey]: [...currentSelected, {
                                                                trigger: customTriggerInput.trim(),
                                                                impact: customImpactInput.trim(),
                                                                isCustom: true
                                                            }]
                                                        }
                                                    }));
                                                    
                                                    setCustomTriggerInput("");
                                                    setCustomImpactInput("");
                                                }
                                            }}
                                            disabled={!customTriggerInput.trim() || !customImpactInput.trim()}
                                        >
                                            Add change
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Selected Triggers Display - Only show when selector is closed */}
                        {!showTriggerSelector && (
                            (() => {
                                const triggerKey = `${currentChapter}:${participationLevel}`;
                                const selectedTriggers = (userData.selectedTriggers || {})[triggerKey] || [];
                                
                                if (selectedTriggers.length === 0) {
                                    return (
                                        <div className={styles.variabilityContainer}>
                                            <div className={`${styles.card} ${styles.variabilityCard} ${styles.emptyTriggerCard}`}>
                                                <div className={styles.emptyTriggerMessage}>
                                                <p>No changes selected</p>
                                                <span>Click &quot;Select what might change&quot; above to add changes for this chapter</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                
                                return (
                                    <div className={styles.variabilityContainer}>
                                        {selectedTriggers.map((prompt, index) => (
                                            <div key={index} className={`${styles.card} ${styles.variabilityCard}`}>
                                                <div className={styles.variabilityPoint}>
                                                    <div className={styles.variabilityContent}>
                                                        <div className={styles.variabilityMain}>{prompt.trigger}</div>
                                                        <div className={styles.variabilityImpact}>{prompt.impact}</div>
                                                    </div>
                                                    
                                                    {/* Remove button for all triggers */}
                                                    <button 
                                                        className={styles.deleteTriggerIconButton}
                                                        onClick={() => {
                                                            const triggerKey = `${currentChapter}:${participationLevel}`;
                                                            const currentSelected = (userData.selectedTriggers || {})[triggerKey] || [];
                                                            setUserData(prev => ({
                                                                ...prev,
                                                                selectedTriggers: {
                                                                    ...(prev.selectedTriggers || {}),
                                                                    [triggerKey]: currentSelected.filter((_, i) => i !== index)
                                                                }
                                                            }));
                                                        }}
                                                        title="Remove change"
                                                    >
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()
                        )}
                    </div>

                    {/* Life Continuity Snapshots Footer */}
                    <div className={styles.dashboardSection} style={{ marginTop: '3rem' }}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionLabel}>Life continuity snapshots</span>
                        </div>
                        <div className={`${styles.card} ${styles.snapshotCard}`}>
                            <div className={styles.snapshotItem}>
                                <span>Status history: <span className={styles.snapshotValue}>{userData.statusUpdateCount || 0} {userData.statusUpdateCount === 1 ? 'update' : 'updates'}</span></span>
                                <span className={styles.divider}>|</span>
                                <span>Preparation reused: <span className={styles.snapshotValue}>{userData.preparationReuseCount || 0} {userData.preparationReuseCount === 1 ? 'time' : 'times'}</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'children' && (
                <div className={`animate-fade-in ${styles.tabContentWrapper}`}>
                    <div className={styles.dashboardSection}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionLabel}>Linked Children</span>
                        </div>

                        <div className={styles.childList}>
                            {userData.children.length === 0 ? (
                                <p style={{ color: '#6B7280', textAlign: 'center', padding: '2rem' }}>No children added yet.</p>
                            ) : (
                                userData.children.map(child => (
                                    <div key={child.id} className={styles.childCard}>
                                        <div className={styles.childInfo}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                backgroundColor: '#F3F4F6',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: '600',
                                                color: '#798679'
                                            }}>
                                                {child.firstName[0]}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600' }}>{child.firstName} {child.lastName}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                                                    Age: {child.ageRange} • {child.supportNeeds} Needs
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.childActions}>
                                            <button
                                                className={styles.actionButton}
                                                onClick={() => handleEditClick(child)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                                onClick={() => handleDeleteClick(child.id)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            className={styles.addChildButton}
                            onClick={() => setIsModalOpen(true)}
                        >
                            + Add another child
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'profile' && (
                <div className={`animate-fade-in ${styles.tabContentWrapper}`}>
                    <div className={styles.dashboardSection}>
                        <div className={styles.sectionHeader} style={{ marginBottom: '1rem' }}>
                            <span className={styles.sectionLabel}>Profile</span>
                        </div>

                        {/* Stats Grid */}
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>{userData.selectedChapters.length}</span>
                                <span className={styles.statLabel}>Life Chapters</span>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>{userData.children.length}</span>
                                <span className={styles.statLabel}>Children Linked</span>
                            </div>
                        </div>

                        {/* Edit Profile Form */}
                        <div className={styles.profileForm}>
                            <h3 className={styles.profileFormTitle}>Account Details</h3>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                updateProfile(profileFormData.firstName, profileFormData.lastName);
                                alert('Profile updated successfully!');
                            }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>First Name</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={profileFormData.firstName}
                                        onChange={(e) => setProfileFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Last Name</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={profileFormData.lastName}
                                        onChange={(e) => setProfileFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Email Address</label>
                                    <input
                                        type="email"
                                        className={styles.input}
                                        value={userData.email}
                                        disabled
                                        style={{ background: '#f9fafb', cursor: 'not-allowed' }}
                                    />
                                </div>
                                <Button type="submit" variant="primary" className={styles.saveProfileButton}>
                                    Save Changes
                                </Button>
                            </form>
                        </div>

                    </div>
                </div>
            )}

            {/* Child Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingChild ? 'Edit Child' : 'Add Child'}
            >
                <form onSubmit={handleModalSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>First Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={formData.firstName}
                            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Last Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={formData.lastName}
                            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Age Range</label>
                        <select
                            className={styles.select}
                            value={formData.ageRange}
                            onChange={e => setFormData({ ...formData, ageRange: e.target.value })}
                            required
                        >
                            <option value="">Select age</option>
                            <option value="2-4">2-4 years</option>
                            <option value="5-7">5-7 years</option>
                            <option value="8-10">8-10 years</option>
                            <option value="11-12">11-12 years</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>How much support do they usually need day-to-day?</label>
                        <select
                            className={styles.select}
                            value={formData.supportNeeds}
                            onChange={e => setFormData({ ...formData, supportNeeds: e.target.value })}
                            required
                        >
                            <option value="">Select support level</option>
                            <option value="low">A little support</option>
                            <option value="medium">Some support</option>
                            <option value="high">A lot of support</option>
                        </select>
                    </div>
                    <div className={styles.modalActions}>
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Save
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Chapter Selection Modal */}
            <ChapterSelectionModal
                isOpen={isChapterModalOpen}
                onClose={() => setIsChapterModalOpen(false)}
                initialSelectedChapters={userData.selectedChapters}
                initialStatuses={userData.chapterStatuses}
                onSave={handleChapterSave}
            />

            {/* Prepare Support Modal */}
            {(() => {
                // Get prompts for current chapter and participation level
                const chapterKey = currentChapter === 'Travel & holiday' ? 'Travel & holidays' : currentChapter;
                const prompts = PREDICTABLE_VARIABILITY_MAP[chapterKey]?.[participationLevel] || [];
                
                return (
                    <PrepareSupportModal
                        isOpen={isPrepareSupportModalOpen}
                        onClose={() => setIsPrepareSupportModalOpen(false)}
                        chapter={currentChapter}
                        participationLevel={participationLevel}
                        prompts={prompts}
                        onReuse={() => {
                            // Track preparation reuse
                            setUserData(prev => ({
                                ...prev,
                                preparationReuseCount: (prev.preparationReuseCount || 0) + 1
                            }));
                        }}
                    />
                );
            })()}
        </div>
    );
}
