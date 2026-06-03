# Open Social Network Protocol v0.1

Open Social Network v0.1 proves a narrow but important idea: a decentralized social feed can be built from sovereign pages, static JSON files, and cryptographically signed posts.

This document is intentionally small. The protocol should earn complexity only when real use requires it.

## Design Goals

- Make identity portable across hosts and domains.
- Let profiles be hosted on ordinary static infrastructure.
- Let aggregators verify post ownership without central accounts.
- Keep the first version readable by developers and inspectable by users.
- Leave ranking, moderation, indexing, and discovery open to independent implementations.

## Identity

The durable identity is a public/private key pair. A human-readable handle points to that identity, but the key is the trust anchor.

An Open Social Network identity file must be available as JSON. Recommended locations:

- `/profile.json`
- `/.well-known/open-social-network.json`

The identity file contains:

- protocol marker
- protocol version
- handle
- display name
- optional profile metadata
- public signing key
- endpoints for profile and feed files

## Feed

A feed is a JSON document containing signed posts from a single author. The feed author must match the profile handle.

Recommended location:

- `/feed.json`

Aggregators may fetch followed profiles, resolve feed endpoints, verify post signatures, and merge valid posts chronologically.

## Signed Posts

Every post must include a signature over its canonical signing payload.

The signing payload is the post object without the `signature` field. Object keys are sorted recursively before serialization. Undefined values are omitted. Array order is preserved.

The first supported algorithm is:

- `ES256`
- ECDSA P-256
- SHA-256
- base64url-encoded raw signature bytes

## Aggregator Behavior

A basic aggregator should:

1. Load followed profile URLs.
2. Fetch each `profile.json`.
3. Resolve and fetch each feed endpoint.
4. Reject feeds where `feed.author` does not match `profile.handle`.
5. Verify every post against the profile public key.
6. Render only verified posts.
7. Expose diagnostics for rejected posts and failed feeds.

## Non-Goals for v0.1

The first version does not define:

- account creation
- passwords
- global user search
- global follower counts
- moderation policy
- ranking algorithms
- encrypted messaging
- media storage
- payment systems
- tokens or blockchains

Those can exist as optional layers above the protocol.

## Compatibility

Clients should ignore unknown fields. Future versions should prefer optional extension fields over breaking changes.

## Relationship To Existing Decentralized Social Platforms

Open Social Network is not based on the idea that decentralized social media is new. Projects such as Mastodon, ActivityPub, Nostr, Bluesky, Diaspora, Matrix, and the broader fediverse have already made important contributions to open social systems, decentralized identity, federation, and protocol-based communication.

This protocol explores a different direction: keep the core small, make identity portable by default, and let social clients compete without owning the user, the graph, or the audience.

### Design Pressures

Many decentralized systems still depend heavily on servers, relays, instances, or providers. Even when the network is federated, identity can remain tied to infrastructure that users do not fully control. Open Social Network aims for profiles that feel closer to a website, a domain, or an email identity than an account rented from a server.

Many systems also ask mainstream users to understand federation, relays, instances, self-hosting, keys, or protocol internals. The protocol should support decentralization at the infrastructure layer without forcing those details into the everyday user experience.

Creator ownership is a primary design goal. Visibility, reputation, ranking, recommendations, and social graphs should not become permanently dependent on a specific platform, app, host, or algorithm. Open Social Network is designed around portable identity, portable followers, portable reputation, and replaceable aggregators.

The protocol intentionally starts with a small surface: identity, profiles, feeds, follows, signed posts, and portable signed actions. More advanced capabilities should be optional layers that remain inspectable and replaceable.

### Direction

Open Social Network is protocol-first. Official tools are reference implementations, not the network itself.

The protocol should allow users to create a page, write posts, react, comment, follow, move hosts, change aggregators, or self-host without losing identity or audience. It should support hosted providers, local folders, personal domains, managed hosting, mirrors, and self-managed infrastructure without making any one provider mandatory.

The protocol itself should not contain a central authority that can remove an identity globally, while hosts, apps, and aggregators remain free to moderate what they store, index, or display. Algorithms should compete, and no single company should control visibility for the whole network.

Open Social Network does not claim to have solved decentralized social media. Moderation, spam, discovery, scaling, onboarding, incentives, and safety remain difficult problems. This protocol is an attempt to explore a simpler, more user-centric, and more sovereign direction for social identity on the internet.
