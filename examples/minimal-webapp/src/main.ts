import { VERSION } from 'voice-sdk';

document.addEventListener('DOMContentLoaded', () => {
  const el = document.createElement('div');
  el.textContent = `Voice SDK version: ${VERSION}`;
  document.body.appendChild(el);
});
