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
- endpoints for profile, feed, public actions, and encrypted messages

## Feed

A feed is a JSON document containing signed posts from a single author. The feed author must match the profile handle.

Recommended location:

- `/feed.json`

Aggregators may fetch followed profiles, resolve feed endpoints, verify post signatures, and merge valid posts chronologically.

## Portable Follows

Follows are portable relationship records. They should not exist only inside one aggregator's local database.

The recommended public storage location is:

- `/opensocial/follows/index.json`

A follow list is a public JSON document with:

- `protocol: "open-social-network"`
- `version: "0.1"`
- `owner`, the profile handle that publishes the list
- `follows`, a list of followed profile references

Each follow entry contains:

- `profile`, the followed profile URL
- optional `handle`, a human-readable hint for the followed identity

The follow list is intentionally simple in v0.1. It is owned by the profile that publishes it. Aggregators may use it to restore a user's graph across browsers and clients, seed a timeline, or help users migrate between aggregators. Clients should deduplicate follows by `profile` and ignore malformed entries.

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
- `/opensocial/actions/inbox/index.json`
- `/opensocial/actions/{action-id}.json`

The actor-owned action log at `/opensocial/actions/index.json` is a public JSON document with:

- `protocol: "open-social-network"`
- `version: "0.1"`
- `actor`, the profile handle that published the actions
- `actions`, a list of signed actions created by that actor

Aggregators may fetch this conventional action log for every loaded profile. Actions from this log should render only when `action.actor` matches the log actor, the target profile is also loaded, and the action signature verifies against the actor profile.

A profile may advertise `endpoints.actions` when its host accepts signed public actions from compatible apps. The recommended default inbox path is `/opensocial/actions/inbox/index.json`.

An action inbox is a public JSON document with:

- `protocol: "open-social-network"`
- `version: "0.1"`
- `owner`, the profile handle that owns the inbox
- `actions`, a list of signed actions from any verified actor

Compatible inbox implementations should accept `POST` requests containing one signed action, verify the action against the actor profile, ensure `action.target.author` matches `owner`, reject duplicate action ids, and store only verified public actions. Static-only hosts can still update the same file through folder sync, Git, object storage, or any future compatible write adapter.

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

1. Load followed profile URLs from local user choice and, when available, the user's portable follow list.
2. Fetch each `profile.json`.
3. Resolve and fetch each feed endpoint.
4. Reject feeds where `feed.author` does not match `profile.handle`.
5. Verify every post against the profile public key.
6. Fetch and verify each loaded profile's conventional public action log when available.
7. Fetch and verify advertised public action inboxes when available.
8. Fetch encrypted direct-message envelopes only when the user has opted into a compatible inbox.
9. Render only verified posts, verified public actions, and direct messages that decrypt locally.
10. Expose diagnostics for rejected posts, rejected actions, failed feeds, and undecryptable messages.

For v0.1 reference behavior, a public action from an actor log should be rendered only when:

- `action.actor` matches the log actor
- `action.target.author` is a loaded profile
- the action signature verifies against the actor profile public key

A public action from an inbox should be rendered only when:

- `action.target.author` matches the inbox owner
- the actor profile is known to the aggregator
- the action signature verifies against the actor profile public key

Actions from unknown actors, actions targeting unknown profiles, actions with invalid signatures, and actions targeting another inbox owner should be reported as rejected actions instead of displayed.

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

Open Social Network does not claim that decentralized social media starts here.

Mastodon, ActivityPub, Nostr, Bluesky/AT Protocol, Diaspora, Matrix, and the broader fediverse have already advanced open social infrastructure in important ways. They have explored federation, portable identity, relays, moderation, community governance, and protocol-based communication at real scale.

Open Social Network exists because we believe a few hard problems still need a simpler path for mainstream adoption.

Email has protocols. DNS has protocols. The web has protocols. AI systems are beginning to use open interoperability layers. Social identity should have the same kind of open, inspectable foundation instead of living only inside applications that can change the rules, the algorithm, or the audience relationship at any time.

This protocol document defines the smallest useful version of that foundation.

### What Still Feels Unresolved

- **Identity is often attached to infrastructure.** Many systems still ask users to depend on an instance, relay, provider, app, or hosted account namespace. Open Social Network starts from a sovereign web identity: a page and key that can move across hosts and interfaces.
- **The user experience is still too technical.** Most people want a profile, posts, follows, reactions, comments, messages, discoverability, and portability. They should not need to understand federation, relays, static hosting, keys, or JSON to participate.
- **Creator ownership remains fragile.** Visibility, reputation, audiences, and social history can still become tied to one app, one server, or one algorithm. Open Social Network is designed so followers, public actions, and reputation can become portable protocol data instead of platform data.
- **Core systems can become too large to explain.** Open Social Network keeps the base layer small: profiles, feeds, signed posts, signed public actions, encrypted messages, and discovery. More complex systems should be optional modules, not requirements for reading a page.

### The Open Social Network Direction

- **Profiles belong to users, not platforms.** A profile is a sovereign web identity, closer to a website, domain, or email identity than an account rented from an app.
- **Followers belong to creators.** Audience, reputation, and social history should be portable protocol data, not assets trapped inside one company database.
- **Profiles are independent web pages.** A social identity should be able to live on static hosting, a personal server, a community host, object storage, mirrors, or future compatible storage layers.
- **Aggregators are replaceable.** Aggregators browse, verify, rank, moderate, and display the network. They do not own the identities underneath.
- **Algorithms should compete.** Recommendation systems should influence discovery, not decide whether a person effectively exists online.
- **The protocol has no global ban switch.** Safety and moderation are real requirements, but they should be handled by hosts, apps, communities, filters, user choice, and applicable infrastructure law rather than a central protocol owner.
- **Identity must be portable.** Users should be able to migrate hosts, change providers, self-host, or create mirrors without losing identity or audience.
- **Self-hosting must remain possible.** Hosted providers can make the network easier, but the protocol must preserve the right to fully own and host a presence independently.
- **The protocol belongs to nobody.** Open Social Network is open source infrastructure, not a platform controlled by one company.
- **Decentralization must stay practical.** Users should experience simple actions: create a page, post, follow, react, comment, message, and publish. Protocol details should support verification without becoming a daily burden.
- **Evolution must protect users.** The protocol should remain modular, extensible, and forward-compatible so new capabilities do not break existing identities.

### What v0.1 Is Trying To Prove

v0.1 is intentionally small. It focuses on sovereign profiles, signed feeds, signed public actions, encrypted direct-message envelopes, and static web compatibility.

The goal is not to defeat every previous approach. The goal is to learn from them and test a different primitive: social identity as ordinary web infrastructure, inspectable by developers and usable by normal people.

The protocol should feel closer to HTML or RSS for social identity than to a massive distributed operating system.

### Final Thought

Open Social Network has not solved every hard problem in decentralized social media. Spam, safety, abuse, discovery, onboarding, moderation, scaling, and creator incentives require serious work.

This protocol exists to make that work possible on top of a simple foundation: user-owned social identity, signed public records, portable relationships, encrypted private communication, and interfaces that ordinary people can use.

The long-term goal is not to create the dominant social platform. The goal is to make social platforms optional.
