# Voice SDK API

## VoiceSDKOptions
- `authHost` (**string**): Base URL for the auth service used to obtain short-lived SIP credentials.
- `getToken` (**() => Promise<string>**): Function returning a bearer token for the auth request.
- `fetch` (**typeof fetch**, optional): Custom `fetch` implementation.

## CallOptions
- `media` (**MediaStreamConstraints**, optional): Media constraints for the call.

## VoiceSDK Events
- `connectionChanged(state)`: Fired when the WebSocket connection state changes. `state` is one of `"disconnected" | "connecting" | "connected"`.
- `registrationChanged(state)`: Fired when SIP registration changes. `state` is one of `"unregistered" | "registering" | "registered"`.
- `incomingCall(session)`: Emitted for an incoming call with a new `CallSession`.
- `callUpdated(session)`: Emitted whenever a call's state changes.

## CallSession
Represents an active SIP call.
- `id` (**string**): Unique call identifier.
- `state` (**"idle" | "ringing" | "active" | "held" | "ended"**): Current call state.
- `mute()`, `unmute()`: Toggle audio sending.
- `hold()`, `unhold()`: Toggle SIP hold.
- `dtmf(tone)`: Send a DTMF tone.
- `transfer(target)`: Blind transfer to another destination.
- `hangup()`: Terminate the call.
- `on(event, handler)`: Listen for call-specific events (`"ended" | "updated"`).

## VoiceSDK
```ts
const sdk = new VoiceSDK(options);
```
### Methods
- `init(): Promise<void>` – Fetch credentials and prepare internal JsSIP `UA`.
- `call(destination, options?): Promise<CallSession>` – Start an outgoing call.
- `on(event, handler)` / `off(event, handler)` – Subscribe/unsubscribe from `VoiceSDK` events.
- `destroy()` – Tear down all resources.

## Event Semantics & State Model
- **Connection**: `disconnected` → `connecting` → `connected` (and back on failures).
- **Registration**: `unregistered` → `registering` → `registered`.
- **Call**: `idle` → `ringing` → `active` → `held`/`active` → `ended`.

## Examples
### Initialize
```ts
const sdk = new VoiceSDK({
  authHost: 'https://auth.example.com',
  getToken: async () => 'bearer-token',
});
await sdk.init();
```

### Outgoing Call
```ts
const call = await sdk.call('sip:alice@example.com');
call.on('updated', () => console.log(call.state));
```

### Incoming Call
```ts
sdk.on('incomingCall', (session) => {
  session.on('ended', () => console.log('call ended'));
});
```

### Mute/Hold/DTMF/Transfer
```ts
call.mute();
call.hold();
call.dtmf('1');
call.transfer('sip:bob@example.com');
```

### Device Selection
```ts
const devices = await navigator.mediaDevices.enumerateDevices();
const mic = devices.find((d) => d.kind === 'audioinput');
const call = await sdk.call('sip:alice@example.com', {
  media: { audio: { deviceId: mic?.deviceId ? { exact: mic.deviceId } : undefined } }
});
```
