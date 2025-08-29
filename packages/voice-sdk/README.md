# Voice SDK

A TypeScript SDK wrapping [JsSIP](https://jssip.net) to place and receive SIP calls over WebRTC.

## Quick Start

```bash
npm install @company/voice-sdk
```

```ts
import { VoiceSDK } from '@company/voice-sdk';

const sdk = new VoiceSDK({
  token: 'TOKEN',
  authServer: 'https://auth.example.com'
});

await sdk.init();
await sdk.call({ target: '1001' });
```
