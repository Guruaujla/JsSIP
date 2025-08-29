# Voice SDK API

## `class VoiceSDK`

### constructor(options: VoiceSDKOptions)
Create instance with auth token and server.

### `init(): Promise<void>`
Fetch credentials and register with SIP server.

### `call(options: CallOptions): Promise<CallSession>`
Start an outbound call.

### `getActiveSessions(): CallSession[]`
List active calls.

### `on(event, handler)`
Subscribe to events.

### `destroy(): Promise<void>`
Stop UA and clear sessions.
