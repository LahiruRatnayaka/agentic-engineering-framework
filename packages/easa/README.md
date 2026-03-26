# ⚠️ @agentic-eng/easa — DEPRECATED

> **This package is deprecated and will be removed after 15 April 2026.**
>
> Please migrate to [`@agentic-eng/agent`](https://www.npmjs.com/package/@agentic-eng/agent), which contains all the same exports.

---

## Migration Guide

Replace your dependency:

```bash
# Remove this package
npm uninstall @agentic-eng/easa

# Install the replacement
npm install @agentic-eng/agent
```

Update your imports:

```diff
- import { Agent, ToolRegistry } from '@agentic-eng/easa';
+ import { Agent, ToolRegistry } from '@agentic-eng/agent';

- import type { LLMProvider, Tool } from '@agentic-eng/easa';
+ import type { LLMProvider, Tool } from '@agentic-eng/agent';
```

**No API changes** — all exports are identical. This is a drop-in replacement.

---

## Why?

The `@agentic-eng/easa` umbrella package was a thin re-export layer over `@agentic-eng/agent`. Going forward, `@agentic-eng/agent` is the single, primary package for the EASA framework. Consolidating to one package simplifies installation, reduces confusion, and streamlines releases.

## Timeline

| Date | Action |
| --- | --- |
| **Now** | `@agentic-eng/easa` marked as deprecated on npm |
| **15 April 2026** | Final version — no further updates |
| **After 15 April 2026** | Package will remain on npm but receive no maintenance |

## Feedback & Contact

Questions about migrating? Reach out:

- **Email:** [lahirunimantha@outlook.com](mailto:lahirunimantha@outlook.com)
- **LinkedIn:** [Lahiru Nimantha](https://www.linkedin.com/in/lahirunimantha/)

## License

[MIT](../../LICENSE)
