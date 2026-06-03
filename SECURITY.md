# Security Policy

OpenSocial Core is early alpha protocol software. Do not use it yet as the sole trust layer for high-risk or production-critical identity systems.

## Reporting Security Issues

Please report suspected vulnerabilities privately through GitHub Security Advisories when available. If advisories are not enabled, open a minimal public issue without exploit details and request a private channel.

## Areas of Interest

We especially care about:

- signature bypasses
- canonicalization inconsistencies
- key import or algorithm confusion
- feed spoofing
- identity confusion across handles, domains, and keys
- unsafe examples that could leak private keys

## Supported Versions

Only the current `main` branch is supported during the alpha period.
