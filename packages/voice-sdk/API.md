# Voice SDK API

## `class VoiceSDK`

### constructor(options: VoiceSDKOptions)
Create instance with auth token and server.
**Options:**
*   `token`: Organizational token.
*   `authServer`: Auth server URL (SDK appends `/sip-credentials`).
*   `ice`: ICE (STUN/TURN) configuration.
*   `media`: Audio constraints and device IDs.
*   `sounds`: Ringtone URL.
*   `sip`: Advanced SIP settings (registrar, user agent, timers).
*   `erp`: ERP integration settings (API URL, headers).

### `init(): Promise<void>`
Fetch credentials and register with SIP server. Handles leader election (only one tab registers).

### `call(options: CallOptions): Promise<CallSession>`
Start an outbound call.
**Options:**
*   `target`: Destination.
*   `extraHeaders`: Custom SIP headers.
*   `withEarlyMedia`: Enable early media.
*   `dtmfMode`: 'RFC2833' or 'SIP_INFO'.

### `getActiveSessions(): CallSession[]`
List active calls.

### `on(event, handler)`
Subscribe to events:
*   `ready`
*   `connectionChanged` (connecting, connected, disconnected, reconnecting)
*   `registrationChanged` (registered, unregistered, failed)
*   `incomingCall` (session, from, displayName, data)
*   `callUpdated` (session, state, reason)
*   `callSummary` (duration, result, timestamps)
*   `deviceChanged` (microphones, speakers)
*   `error`

### `destroy(): Promise<void>`
Stop UA and clear sessions.

---

## `interface CallSession`

### Properties
*   `id`: Call ID.
*   `direction`: 'inbound' | 'outbound'.
*   `state`: CallState.

### Methods
*   `answer(options?)`: Answer call.
*   `hangup()`: End call.
*   `hold()`: Put on hold.
*   `resume()`: Resume from hold.
*   `mute()`: Mute mic.
*   `unmute()`: Unmute mic.
*   `sendDTMF(tone)`: Send DTMF.
*   `transfer(target)`: Blind transfer.
*   `getSummary()`: Get call summary object.
