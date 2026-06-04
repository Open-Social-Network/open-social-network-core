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

Open Social Network is not pretending that decentralized social media begins here.

Mastodon, ActivityPub, Nostr, Bluesky/AT Protocol, Diaspora, Matrix, and the broader fediverse have already done serious work on open social systems, federation, portable identity, relays, community governance, and protocol-based communication. Open Social Network exists because we believe the internet still needs a simpler, user-owned social primitive.

Email has protocols. DNS has protocols. The web has protocols. AI systems are beginning to use open interoperability layers. Social identity should have the same kind of open, inspectable foundation instead of living only inside applications that can change the rules, the algorithm, or the audience relationship at any time.

Open Social Network explores one clear idea: a social profile should be a sovereign web identity first, and an app account second.

### The Direction

- Profiles are sovereign. A profile belongs to the person, organization, project, or community that publishes it.
- Aggregators are replaceable. They read, verify, rank, moderate, and display the network; they do not own it.
- Creators should keep their audience. The long-term goal is portable followers, portable reputation, and portable social history across apps and hosts.
- Algorithms should compete. No single feed should decide visibility for the whole network.
- The protocol should stay small. The base layer should be easy to inspect, implement, and explain.
- Users should not need to become infrastructure experts. Decentralization belongs in the design, not in the user's daily burden.
- The protocol has no global account switch. Moderation belongs to hosts, apps, aggregators, communities, and users rather than one central protocol owner.

### Why This Is Different

Many decentralized systems still ask users to choose an instance, trust a relay, understand federation, manage provider-specific identity, or accept that visibility and reputation live inside a particular service. Those systems are valuable, but they can still feel like accounts attached to infrastructure.

Open Social Network starts from static, signed, portable web objects: a profile, a feed, posts, public actions, and encrypted message envelopes. A page can live on GitHub Pages, Cloudflare Pages, Netlify, Vercel, S3-compatible storage, a personal server, a community host, or any future compatible storage layer. The official tools are reference implementations, not the network itself.

### What v0.1 Is Trying To Prove

The early protocol is intentionally small. It focuses on identity, profiles, signed posts, signed public actions, and encrypted messages before adding more complex layers such as global search, recommendation systems, media hosting, managed hosting, advanced moderation, or creator monetization.

The bet is that a minimal, verifiable base can make social media feel more like open internet infrastructure: clients can compete, hosts can differ, communities can moderate, algorithms can improve, and users keep the identity underneath.

### Final Thought

Open Social Network has not solved every hard problem in decentralized social media. Spam, safety, abuse, discovery, onboarding, moderation, scaling, and creator incentives require serious work.

This protocol exists to make that work possible on top of a simple foundation: user-owned social identity, signed public records, portable relationships, encrypted private communication, and interfaces that ordinary people can use.
