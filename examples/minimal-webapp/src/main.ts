import { VoiceSDK } from '@company/voice-sdk';

let sdk: VoiceSDK | undefined;

document.getElementById('init')?.addEventListener('click', async () => {
  const token = (document.getElementById('token') as HTMLInputElement).value;
  sdk = new VoiceSDK({ token, authServer: 'https://auth.example.com' });
  await sdk.init();
  alert('SDK ready');
});

document.getElementById('call')?.addEventListener('click', async () => {
  if (!sdk) return;
  const target = (document.getElementById('target') as HTMLInputElement).value;
  await sdk.call({ target });
});
