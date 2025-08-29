# Voice SDK Monorepo

This repository contains the Voice SDK and supporting examples.

## Getting Started

```bash
pnpm i
pnpm -w run lint && pnpm -w run typecheck && pnpm -w run test && pnpm -w run build
pnpm --filter examples/minimal-webapp dev
```

The SDK is located in `packages/voice-sdk`. A minimal web application using the SDK lives in `examples/minimal-webapp`.
