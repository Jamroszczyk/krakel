// Google Analytics gtag types
interface Window {
  gtag?: (
    command: 'consent' | 'config' | 'event' | 'js',
    targetId: string | Date | 'update',
    config?: Record<string, any>
  ) => void;
  dataLayer?: any[];
}

