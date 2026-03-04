import { FeedbackMode } from './types';

interface Props {
  onSelect: (mode: FeedbackMode) => void;
  onClose: () => void;
}

interface MenuAction {
  mode: FeedbackMode;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const actions: MenuAction[] = [
  {
    mode: 'text',
    label: 'Text',
    color: '#6c63ff',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    mode: 'audio',
    label: 'Audio',
    color: '#22c55e',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
  },
  {
    mode: 'screen',
    label: 'Screen',
    color: '#f59e0b',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        <circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    mode: 'schedule',
    label: 'Schedule',
    color: '#ec4899',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

export default function FeedbackMenu({ onSelect, onClose }: Props) {
  const handleSelect = (mode: FeedbackMode) => {
    if (mode === 'schedule') {
      window.open('INSERT_YOUR_GOOGLE_MEET_SCHEDULER_LINK', '_blank', 'noopener,noreferrer');
      onClose();
      return;
    }
    onSelect(mode);
  };

  return (
    <div className="fw-menu" role="menu" aria-label="Feedback options">
      {actions.map(action => (
        <button
          key={action.mode}
          className="fw-menu-item"
          style={{ '--item-color': action.color } as React.CSSProperties}
          onClick={() => handleSelect(action.mode)}
          role="menuitem"
          aria-label={action.label}
          title={action.label}
        >
          <span className="fw-menu-icon">{action.icon}</span>
          <span className="fw-menu-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
