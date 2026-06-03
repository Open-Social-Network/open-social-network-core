# Contributing to OpenSocial Core

OpenSocial Core should remain small, clear, and implementation-oriented.

## Principles

- Prefer simple web-native primitives.
- Keep protocol changes backward compatible whenever possible.
- Add tests for behavior that affects signing, verification, parsing, or aggregation.
- Document all protocol changes in `docs/protocol-v0.1.md` or a future versioned document.
- Avoid coupling the protocol to one aggregator, host, company, or deployment model.

## Local Development

```bash
npm install
npm test
npm run build
```

## Pull Requests

Every pull request should explain:

- what changed
- why it belongs in the core protocol
- compatibility impact
- validation performed

Protocol changes should include tests and schema updates when applicable.
