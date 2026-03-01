---
name: spec-writing
description: How to write specs, name capabilities, and structure requirements. Load this when creating or reviewing proposals, specs, or capability lists.
---

# Spec Writing

How to write specifications and name capabilities correctly in this project.

## What is a Capability?

A **capability** is a **product domain**. One capability = one spec directory = one `openspec/specs/<domain>/spec.md` file.

Capabilities are named after the domain they represent. Features, behaviors, and functions within that domain are expressed as **requirements** inside the single spec.

| Correct (domain name) | Wrong (domain-feature)     | Why it's wrong                                              |
|-----------------------|----------------------------|-------------------------------------------------------------|
| `execution`           | `execution-loop`           | "loop" is a feature within execution                        |
| `execution`           | `execution-triggering`     | "triggering" is a requirement within execution              |
| `auth`                | `auth-login`               | "login" is a feature within auth                            |
| `auth`                | `user-auth`                | "user-auth" scopes auth to a feature — the domain is `auth` |
| `data`                | `data-export`              | "export" is a feature within the data domain                |
| `planning`            | `planning-validation`      | "validation" is a requirement within planning               |
| `entry`               | `entry-routing`            | "routing" is a requirement within entry                     |
| `spec-governance`     | `spec-governance-naming`   | "naming" is a requirement within spec-governance            |

**Rule**: If the name has a hyphen that separates a domain from a feature, it's wrong. The capability name IS the domain name. Everything after that first conceptual boundary is a requirement within the spec.

Note: some domains naturally have hyphens in their name (e.g., `spec-governance`). The test is whether the full name represents a coherent product domain, not whether it contains a hyphen.

## One Spec Per Domain

A domain has exactly **one** spec at `openspec/specs/<domain>/spec.md`. All capabilities within the domain are expressed as requirements within that single spec.

```
openspec/specs/
  execution/
    spec.md          <-- ONE spec, many requirements inside
  planning/
    spec.md          <-- ONE spec, many requirements inside
  spec-governance/
    spec.md          <-- ONE spec, many requirements inside
```

When writing a proposal's Capabilities section:
- **New Capabilities** should list domain names, not features
- **Modified Capabilities** should reference existing spec directory names from `openspec/specs/`
- If the change adds a new feature to an existing domain, it's a **Modified Capability** (or just new requirements added to the existing spec), not a new capability

## Spec Writing Rules

The authoritative source for spec governance is `openspec/specs/spec-governance/spec.md`. Read it for full rules. Key points:

**Value-centric**: Every requirement must pass the litmus test: "Would a customer, user, or developer care if this stopped working?" If no, it belongs in a design doc.

**No implementation references**: Requirements and scenarios must not reference internal class names, method names, module paths, or data structures.

**No domain names as subjects**: Don't write "the planning domain SHALL..." or "available for the execution domain to execute." Use "the system," "the user," or passive voice.

**RFC 2119 keywords**: Use SHALL/MUST for normative requirements. No informal language ("should," "needs to").

**Testable scenarios**: Every requirement needs at least one scenario with WHEN/THEN format using `####` headers. Each scenario must be specific enough to write an automated test.
