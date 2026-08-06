# Connector logos

Most of the SVG files in this directory are vendor brand marks sourced from
[simple-icons](https://github.com/simple-icons/simple-icons) (the `simple-icons`
npm package, CC0-1.0 licensed), copied at build time rather than imported as a
runtime dependency — same "install as a devDependency, copy the file, don't
ship the whole package" convention as `public/logos/` (see its own NOTICE.md).

`slack.svg` is the one exception: Slack's mark was removed from simple-icons
pending trademark permission, so it's sourced directly from Wikimedia Commons'
[Slack icon 2019.svg](https://commons.wikimedia.org/wiki/File:Slack_icon_2019.svg)
instead. A handful of other connectors (Canva, monday.com, Twilio) have no
verified icon-only mark available from either source and are intentionally
left without a file — `ConnectorCard` falls back to an initial-letter badge
for those, the same graceful degradation `ProviderLogo` uses for unknown
providers.

Each file is named after its connector's id in `mcp-servers/*.json` (e.g.
`notion.svg` ↔ `"id": "notion"`), which is how `ConnectorCard`
(`src/features/connectors/components/connector-card.tsx`) looks them up via
each connector's `iconUrl: "/connector-logos/{id}.svg"`.

To add or refresh a logo: `npm install -D simple-icons`, copy the wanted file
from `node_modules/simple-icons/icons/` here, and rename it to match the
connector's id.

Brand marks remain trademarks of their respective owners; depicting them here
identifies which service each connector talks to and implies no endorsement.
