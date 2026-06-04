# Contributing to Open Social Network Core

Open Social Network Core should remain small, clear, and implementation-oriented.

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

## Project Context

Open Social Network is not trying to erase the work of Mastodon, ActivityPub, Nostr, Bluesky/AT Protocol, Diaspora, Matrix, or the broader fediverse. Those projects have already moved open social infrastructure forward in serious ways.

This repository exists to test a smaller foundation for social identity: sovereign profiles, signed feeds, portable public actions, replaceable aggregators, and web-native discovery. Contributions should keep the core protocol small enough to explain, strict enough to verify, and independent of any single host, app, company, or deployment model.
