import { type FC, useState, useEffect } from 'react';
import { colors } from '../theme/colors';

const CookieConsent: FC = () => {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show modal after a brief delay for better UX
      setTimeout(() => setShowConsent(true), 1000);
    } else if (consent === 'accepted') {
      // Enable Google Analytics if consent was given
      enableGoogleAnalytics();
    }
  }, []);

  const enableGoogleAnalytics = () => {
    // Enable Google Analytics
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
  };

  const disableGoogleAnalytics = () => {
    // Disable Google Analytics
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied'
      });
    }
  };

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    enableGoogleAnalytics();
    setShowConsent(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    disableGoogleAnalytics();
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div 
        style={{
          backgroundColor: colors.neutral.white,
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.primary.main} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: colors.neutral.gray900,
            margin: 0,
          }}>
            Cookie Notice
          </h2>
        </div>

        <div style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: colors.neutral.gray700,
          marginBottom: '24px',
        }}>
          <p style={{ margin: '0 0 16px 0' }}>
            We use cookies and Google Analytics to understand how you use Krakel and to improve your experience.
          </p>
          <p style={{ margin: '0' }}>
            By clicking <strong>"Accept"</strong>, you consent to our use of analytics cookies. 
            You can decline and still use all features of Krakel.
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={handleDecline}
            style={{
              padding: '12px 24px',
              backgroundColor: colors.neutral.gray100,
              color: colors.neutral.gray700,
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.neutral.gray200}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.neutral.gray100}
          >
            Decline
          </button>
          
          <button
            onClick={handleAccept}
            style={{
              padding: '12px 24px',
              backgroundColor: colors.primary.main,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary.dark}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary.main}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

