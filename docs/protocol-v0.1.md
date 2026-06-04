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

## Signed Public Actions

Likes, dislikes, and comments are public actions. They are not private database rows owned by one app. They are signed protocol records that any compatible aggregator can verify and display.

The first action kinds are:

- `reaction` with `reaction: "like"`
- `reaction` with `reaction: "dislike"`
- `reaction` with `reaction: "none"` to clear the actor's current reaction
- `comment` with a public `content` string

Every action targets a post by:

- target type
- target post id
- target post author
- optional target URL

Every action is signed by the actor identity. The signing payload is the action object without the `signature` field, using the same canonical JSON rules as posts.

Aggregators should count reactions with one active reaction per actor per target. When the same actor publishes multiple reactions for the same post, the latest action wins. A `none` reaction removes that actor's active reaction. Comments should be rendered only after the action signature verifies against the actor profile.

Recommended public storage locations are:

- `/opensocial/actions/index.json`
- `/opensocial/actions/{action-id}.json`

Those locations are recommendations, not a central service. Hosts may support writes through HTTPS, WebDAV, Git, local folders, S3-compatible storage, IPFS, relays, inboxes, or other optional modules. A page without public action storage is still a valid Open Social Network page; it is simply read-only for actions until a compatible write path is available.

## Encrypted Direct Messages

Direct messages are encrypted protocol envelopes. They are not plaintext comments, private database rows, or a feature owned by one aggregator.

The first direct-message envelope uses:

- `ECDH-P256-A256GCM`
- a recipient message public key using `ECDH-P256`
- an ephemeral sender message key per message
- AES-GCM ciphertext
- an ES256 signature over the encrypted envelope by the sender identity

The signature proves which identity created the encrypted envelope. The encryption keeps the message body private from aggregators, hosts, indexes, and static storage providers.

A profile may advertise:

- `messagePublicKey`
- `endpoints.messages`

Recommended public storage locations are:

- `/opensocial/messages/inbox/index.json`
- `/opensocial/messages/outbox/index.json`
- `/opensocial/messages/{message-id}.json`

Those paths are storage conventions, not a mandatory service. A host may accept encrypted message writes through any compatible module, including HTTPS, WebDAV, S3-compatible storage, local sync, inbox relays, or future protocol bridges. A page without message storage is still valid; it simply cannot receive direct messages through that host yet.

Clients must not render plaintext unless decryption succeeds with the recipient's private message key and the sender signature verifies against the sender profile.

## Aggregator Behavior

A basic aggregator should:

1. Load followed profile URLs.
2. Fetch each `profile.json`.
3. Resolve and fetch each feed endpoint.
4. Reject feeds where `feed.author` does not match `profile.handle`.
5. Verify every post against the profile public key.
6. Fetch and verify any public action sources it knows about.
7. Fetch encrypted direct-message envelopes only when the user has opted into a compatible inbox.
8. Render only verified posts, verified public actions, and direct messages that decrypt locally.
9. Expose diagnostics for rejected posts, rejected actions, failed feeds, and undecryptable messages.

## Non-Goals for v0.1

The first version does not define:

- account creation
- passwords
- global user search
- global follower counts
- moderation policy
- ranking algorithms
- media storage
- payment systems
- tokens or blockchains

Those can exist as optional layers above the protocol.

## Compatibility

Clients should ignore unknown fields. Future versions should prefer optional extension fields over breaking changes.

## Relationship To Existing Decentralized Social Platforms

Open Social Network does not start from the claim that decentralized social media is new.

Mastodon, ActivityPub, Nostr, Bluesky, Diaspora, Matrix, and the broader fediverse have already proven that open social systems matter. They have advanced federation, decentralized identity, relays, public protocols, community governance, and user choice.

Open Social Network exists because we think some problems still deserve a simpler protocol-first experiment: ownership that starts at the user's page, an experience that feels familiar to nontechnical people, and social records that remain portable across clients, hosts, and aggregators.

The goal is to learn from prior work, not to erase it.

### The Different Bet

Open Social Network treats a profile as a sovereign web object. It should feel closer to a website, a domain, or an email identity than to an account rented from one instance, relay, provider, or app.

The protocol keeps the first layer small: profiles, feeds, signed posts, signed public actions, and encrypted message envelopes. Everything else - ranking, moderation, search, media hosting, notifications, recommendation systems, and managed hosting - can be built as replaceable layers around that foundation.

### Problems We Are Designing Around

Identity should not be trapped in infrastructure users do not control. A person should be able to move hosts, change apps, use mirrors, or self-host without restarting their social existence.

Decentralization should not become homework for everyday users. People should not need to understand federation, relays, instances, key formats, or static hosting before they can create a page and post.

Creators should keep their audience and reputation. Followers, visibility, comments, reactions, and trust signals should be portable protocol data, not private database rows that disappear when a user changes clients.

Aggregators should be replaceable. They should read, verify, rank, moderate, and display the network, but they should not own the identities or the graph. Different aggregators and algorithms should be able to compete.

The protocol should stay small enough to inspect. Open Social Network should feel more like a set of web conventions for social identity than a distributed operating system.

### What This Means In Practice

- A page can be hosted anywhere static files work.
- The public folder is safe to publish; private keys are never published.
- Posts and public actions are signed so any client can verify them.
- Direct messages are stored as encrypted envelopes so hosts can carry them without reading them.
- Official tools are reference implementations, not the network itself.
- Moderation remains possible at the host, app, aggregator, community, and user layer without creating one global protocol owner.

### Final Note

Open Social Network does not claim to have solved decentralized social media. Moderation, spam, abuse handling, discovery, scaling, onboarding, incentives, and safety are hard problems.

This protocol is an attempt to explore a smaller and more user-centered path: social identity as open internet infrastructure, where platforms become interfaces and users keep the underlying identity, audience, and content.
