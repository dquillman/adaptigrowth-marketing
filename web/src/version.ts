export const APP_VERSION = '1.14.0';

const isStaging = typeof window !== 'undefined' && window.location.hostname.includes('staging');

export const DISPLAY_VERSION = isStaging ? `${APP_VERSION} (staging)` : APP_VERSION;
