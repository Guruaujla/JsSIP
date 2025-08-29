# Asterisk Configuration Guide

Example minimal configuration for WebRTC clients.

## `http.conf`

```
wss_port = 8089
```

## `pjsip.conf`

```
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0

[webrtc-client]
type=endpoint
aors=webrtc-client
auth=webrtc-client
use_avpf=yes
media_encryption=dtls
transport=transport-wss
rtp_symmetric=yes
force_rport=yes
direct_media=no
codecs=opus,ulaw

[webrtc-client]
type=aor
contact=sip:webrtc-client@domain

[webrtc-client]
type=auth
auth_type=userpass
username=webrtc-client
password=secret
```

