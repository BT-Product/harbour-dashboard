-- Each agent's dashboards wear their brokerage's brand.
--
-- A client reads Harbour as part of the service they get from their agent,
-- and that agent works under a brokerage brand the client already knows. So
-- the colours belong to the agent (the tenant), not to the app — hardcoding
-- one brokerage's palette would dress every future agent in it.
--
-- The column names a designed preset rather than storing raw colours. Most
-- agents work under one of a handful of franchise brands, every affiliate of
-- a brand is bound to the same brand standards, and a palette needs more than
-- two hex codes to be usable: text colour on the brand colour, hover tints, a
-- sidebar, and contrast checked for all of them. A preset gets that right once
-- per brand. An independent brokerage's brand guide or screenshot becomes a
-- new preset, reviewed before use, rather than colours dropped in unchecked.
--
-- Null, or a key the app doesn't recognise, means the default Harbour look —
-- deliberately no check constraint, so adding a preset is a code change only.

alter table agents
  add column if not exists brand_theme text;

comment on column agents.brand_theme is
  'Key of a designed colour preset in src/lib/brand-themes.ts (e.g. ''sothebys''). Null or unknown = default Harbour palette. Applies to the agent''s own dashboard and every one of their clients''.';
