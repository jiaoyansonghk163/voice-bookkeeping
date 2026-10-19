export function StatusBar() {
  return (
    <div className="status" aria-hidden="true">
      <span>9:41</span>
      <span className="r">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="#f1f5f9">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="#f1f5f9" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1.5 4.2a9.5 9.5 0 0113 0M4 7a6 6 0 018 0" />
          <circle cx="8" cy="10" r="1.2" fill="#f1f5f9" stroke="none" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x=".5" y=".5" width="23" height="12" rx="3.5" stroke="#f1f5f9" opacity=".45" />
          <rect x="2" y="2" width="18" height="9" rx="2" fill="#f1f5f9" />
          <rect x="25" y="4.5" width="1.6" height="4" rx=".8" fill="#f1f5f9" opacity=".45" />
        </svg>
      </span>
    </div>
  );
}
