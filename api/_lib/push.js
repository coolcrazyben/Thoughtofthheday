import webpush from 'web-push';

let _configured = false;

export function getPush() {
  if (!_configured) {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return null; // push disabled
    }
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL ?? 'admin@thoughtoftheday.app'}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    _configured = true;
  }
  return webpush;
}
