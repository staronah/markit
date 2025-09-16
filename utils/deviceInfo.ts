import type { DeviceInfo } from '../types';

export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  // OS Detection
  if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
    os = 'iOS';
  } else if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua)) {
    os = 'macOS';
  } else if (/Win32|Win64|Windows|WinCE/.test(ua)) {
    os = 'Windows';
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }

  // Browser Detection (Order is important)
  if (ua.indexOf("Firefox") > -1) {
    browser = "Mozilla Firefox";
  } else if (ua.indexOf("SamsungBrowser") > -1) {
    browser = "Samsung Internet";
  } else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) {
    browser = "Opera";
  } else if (ua.indexOf("Trident") > -1) {
    browser = "Microsoft Internet Explorer";
  } else if (ua.indexOf("Edg") > -1) { // Edg for Chromium Edge
    browser = "Microsoft Edge";
  } else if (ua.indexOf("Chrome") > -1) {
    browser = "Google Chrome";
  } else if (ua.indexOf("Safari") > -1) {
    browser = "Apple Safari";
  }

  return {
    os,
    browser,
    userAgent: ua,
  };
}
