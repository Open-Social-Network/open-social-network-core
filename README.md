<p align="center">
  <img src="./assets/open-social-network-logo.png" width="96" alt="Open Social Network logo" />
</p>

# Open Social Network Core

Open Social Network Core is the protocol foundation for Open Social Network: an open, decentralized social layer for the web where identity, audience, and content belong to people rather than platforms.

This repository contains the early protocol specification, TypeScript reference primitives, JSON schemas, and conformance-oriented tests for sovereign social pages and signed feeds.

If you want to use Open Social Network rather than implement it, start with Open Social Network Web or the CLI. They let you create a page, write posts, and host the public files anywhere static files are supported.

## In One Minute

Open Social Network Core defines how an independent social page works.

At minimum, a profile has:

1. a public identity file: `profile.json`
2. a public feed file: `feed.json`
3. signed posts that can be verified by any client

If you are building an aggregator, host, SDK, validator, crawler, or sovereign page generator, this repository is the starting point.

If you are a normal user, you should not need to read JSON or cryptography details to get started.

## The Internet Has Protocols for Almost Everything

We have protocols for websites, email, domain names, payments, feeds, files, and even communication between AI systems.

- HTTP lets anyone publish a website.
- DNS lets names point across the internet.
- SMTP lets messages move between independent providers.
- RSS lets clients read feeds without owning them.
- MCP is emerging as a protocol layer for AI tools and agents.

But social identity is still mostly trapped inside platforms.

Your username, followers, posts, reputation, and reach usually belong to a company database. If the platform changes rules, disappears, bans you, locks APIs, or degrades the product, your social existence is trapped with it.

Open Social Network exists to make social identity part of the open internet itself.

## Why Open Social Network Exists

The social web should not require every person to live inside a closed platform database.

Open Social Network starts from a simpler premise:

- a profile can be a page on the internet
- a feed can be a static JSON file
- a post can be verified with a public key
- an aggregator can read the network without owning the network
- followers should follow identities, not companies

The protocol is designed to use infrastructure the web already has: HTTP, DNS, static hosting, caching, CDNs, and browsers.

## What Changes When Social Becomes a Protocol

If Open Social Network works, a social profile becomes more like an email address or a domain name than an account inside an app.

For users:

- you can own your identity
- you can move between providers
- you can keep your audience
- you can self-host or use a host
- you can choose different clients and aggregators
- you are not forced to restart your social graph every time a platform changes

For developers:

- clients can be built without asking permission
- aggregators can compete on UX, ranking, moderation, and discovery
- apps can interoperate through files and signatures instead of private APIs
- innovation moves to the edges of the network

For hosts:

- static hosting can become social infrastructure
- providers can offer sovereign profile hosting without owning the protocol
- migration and mirroring can become first-class features

For the web:

- the social graph becomes portable
- identity becomes durable
- platforms become interfaces, not prisons

## Core Values

### Sovereignty

People own their identity, content, audience, and reputation. No aggregator or company should own the social graph.

### Decentralization

Anyone should be able to host profiles, build clients, run aggregators, index pages, and create recommendation systems.

### Simplicity

The first version avoids tokens, consensus systems, blockchains, and unnecessary distributed infrastructure. The MVP is intentionally built on signed JSON and ordinary web hosting.

### Portability

Users should be able to move domains, change hosting providers, mirror their pages, or self-host without losing identity or audience.

### Open Ecosystem

Open Social Network belongs to nobody. The protocol should support many clients, many aggregators, many hosts, and many moderation or recommendation systems.

### Extensibility

Future capabilities should be optional modules. Older clients should ignore unknown fields gracefully.

## Version 0.1 Scope

Open Social Network Core v0.1 defines the minimum viable social protocol:

- `profile.json` identity files
- `feed.json` post feeds
- ES256 signed posts
- canonical JSON signing payloads
- profile endpoint discovery
- chronological feed aggregation

It does not define accounts, global search, moderation policy, encrypted messaging, recommendations, or media storage. Those should remain independent layers.

## Repository Contents

```text
open-social-network-core/
├── docs/
│   └── protocol-v0.1.md
├── schemas/
│   ├── feed.schema.json
│   ├── post.schema.json
│   └── profile.schema.json
├── src/
│   ├── aggregator/
│   └── protocol/
└── README.md
```

## How To Use This Repository

### If You Want To Understand the Protocol

Start here:

1. Read [docs/protocol-v0.1.md](./docs/protocol-v0.1.md).
2. Inspect [schemas/profile.schema.json](./schemas/profile.schema.json).
3. Inspect [schemas/feed.schema.json](./schemas/feed.schema.json).
4. Look at the signing tests in [src/protocol/signing.test.ts](./src/protocol/signing.test.ts).

### If You Are Building an Aggregator

Use the reference timeline loader in [src/aggregator/timeline.ts](./src/aggregator/timeline.ts) as the baseline behavior:

1. load followed profile URLs
2. fetch profile files
3. resolve feed endpoints
4. verify every post signature
5. render only verified posts
6. report rejected posts and failed feeds

### If You Are Building a Page Host

Your host should be able to publish:

- `profile.json`
- `feed.json`
- optionally `/.well-known/open-social-network.json`

It should never publish private keys.

## Install

```bash
npm install
```

## Validate

```bash
npm test
npm run build
npm audit
```

## Minimal Identity File

```json
{
  "protocol": "open-social-network",
  "version": "0.1",
  "handle": "ada@example.com",
  "name": "Ada Lovelace",
  "publicKey": {
    "alg": "ES256",
    "jwk": {
      "kty": "EC",
      "crv": "P-256",
      "x": "...",
      "y": "..."
    }
  },
  "endpoints": {
    "profile": "/profile.json",
    "feed": "/feed.json"
  }
}
```

## Minimal Feed File

```json
{
  "protocol": "open-social-network",
  "version": "0.1",
  "author": "ada@example.com",
  "posts": [
    {
      "id": "post_001",
      "author": "ada@example.com",
      "createdAt": "2026-06-03T12:00:00.000Z",
      "content": "Hello from a sovereign page.",
      "signature": {
        "alg": "ES256",
        "value": "..."
      }
    }
  ]
}
```

## Related Repositories

- [`open-social-network-cli`](https://github.com/Open-Social-Network/open-social-network-cli) - the easiest way to create and publish a sovereign Open Social Network page
- [`open-social-network-web`](https://github.com/Open-Social-Network/open-social-network-web) - the easiest way to read, create, post, and export a page
- [`open-social-network-page`](https://github.com/Open-Social-Network/open-social-network-page) - a sovereign page template

## Easiest Way To Publish

If you want to create a real Open Social Network identity instead of implementing the protocol directly, start with:

```bash
npx open-social-network
```

The CLI creates a signed sovereign page, validates it, previews it locally, and deploys it to a free static host.

## Status

Open Social Network is in early alpha. The goal of this repository is to make the protocol understandable, testable, and implementable before expanding the ecosystem.

The ambition is large, but the first step is deliberately small: prove that a signed, sovereign, static social feed can exist and be read by any compatible client.
