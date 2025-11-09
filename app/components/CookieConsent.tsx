'use client';

import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (consent === null) {
      // Show banner if no choice has been made
      setShowBanner(true);
    } else {
      // Load analytics if consent was given
      setAnalyticsEnabled(consent === 'accepted');
    }
  }, []);

  const acceptAnalytics = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
    setAnalyticsEnabled(true);
    // Reload page to initialize analytics
    window.location.reload();
  };

  const rejectAnalytics = () => {
    localStorage.setItem('cookie-consent', 'rejected');
    setShowBanner(false);
    setAnalyticsEnabled(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              We use privacy-friendly analytics (no cookies) to understand how visitors use this site. 
              Your data is anonymized and not shared with third parties.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={rejectAnalytics}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={acceptAnalytics}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConditionalAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    setEnabled(consent === 'accepted');
  }, []);

  if (!enabled) {
    return null;
  }

  return <Analytics />;
}

