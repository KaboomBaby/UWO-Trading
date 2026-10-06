insert into public.listings (id, title, category, price, currency, description, seller, location, image_emoji, created_at, collection) values
  ('adventurer-frigate', 'Adventurer Frigate', 'ships', 48000000, 'gold', 'A well-balanced adventure frigate with strong cargo capacity and dependable ocean handling.', 'PortRoyalShipwright', 'Port Royal', '🚢', '2026-10-04T14:00:00Z', 'current'),
  ('armed-merchant-galleon', 'Armed Merchant Galleon', 'ships', 82500000, 'gold', 'Heavy trading hull fitted for long routes and hostile waters. Crew ready, sails inspected.', 'LisbonBroker', 'Lisbon', '⛵', '2026-10-03T10:30:00Z', 'current'),
  ('fast-raiding-cutter', 'Fast Raiding Cutter', 'ships', 27750000, 'gold', 'Compact, quick, and ideal for coastal raids or urgent courier contracts.', 'TortugaRunner', 'Tortuga', '🛥️', '2026-10-02T18:45:00Z', 'current'),
  ('seville-townhouse', 'Seville Townhouse', 'property', 125000000, 'gold', 'A prestigious residence near the trading district with secure storage access.', 'SevilleEstate', 'Seville', '🏘️', '2026-09-29T09:00:00Z', 'current'),
  ('master-cannon-set', 'Master Cannon Set', 'equipment', 16400000, 'gold', 'Matched set of master cannons, cleaned and tested before listing.', 'GunsmithOfGenoa', 'Genoa', '💣', '2026-10-01T12:15:00Z', 'current'),
  ('spice-market-haul', 'Spice Market Haul', 'resources', 8900000, 'gold', 'Cinnamon, pepper, and cloves packed for immediate resale in European ports.', 'AlexandriaTrader', 'Alexandria', '🧺', '2026-09-28T16:20:00Z', 'current'),
  ('escort-contract', 'Trading Convoy Escort', 'services', 5200000, 'gold', 'Experienced escort crew available for multi-port convoys and pirate-heavy routes.', 'BlueWaveFleet', 'London', '🛡️', '2026-10-04T08:10:00Z', 'current'),
  ('legacy-grand-voyager', 'Legacy Grand Voyager', 'ships', 64000000, 'gold', 'A classic long-route vessel preserved in near-original condition for collectors and legacy traders.', 'VeniceArchiveFleet', 'Venice', '⛴️', '2026-09-24T11:00:00Z', 'legacy'),
  ('legacy-merchant-caravel', 'Legacy Merchant Caravel', 'ships', 21500000, 'gold', 'A compact historical caravel suited to legacy exhibition routes and coastal trading.', 'SevilleHarborKeeper', 'Seville', '🪝', '2026-09-21T13:30:00Z', 'legacy')
on conflict (id) do nothing;

insert into public.market_ports (id, name, country, region, specialties, description, image_emoji, docking_capacity, danger_level) values
  ('amsterdam', 'Amsterdam', 'Netherlands', 'Northern Europe', array['Textiles', 'Art', 'Shipbuilding']::text[], 'A northern commercial hub with strong financing and reliable access to European finished goods.', '🏛️', 180, 'low'),
  ('lisbon', 'Lisbon', 'Portugal', 'Southern Europe', array['Navigation instruments', 'Spices', 'Exploration contracts']::text[], 'A launch point for Atlantic routes, expedition crews, and long-range trade logistics.', '🧭', 150, 'moderate'),
  ('port-royal', 'Port Royal', 'Jamaica', 'Caribbean', array['Rum', 'Sugar', 'Privateering']::text[], 'A busy Caribbean port where high profits sit beside serious pirate risk.', '🏴‍☠️', 120, 'high'),
  ('alexandria', 'Alexandria', 'Egypt', 'Africa', array['Spices', 'Papyrus', 'Ancient relics']::text[], 'A Mediterranean-African gateway for specialty cargo and high-margin luxury goods.', '🌴', 140, 'moderate'),
  ('malacca', 'Malacca', 'Malaysia', 'Asia', array['Porcelain', 'Silk', 'Tea']::text[], 'A dense Asian trade node with strong demand for European metals and textiles.', '🏯', 200, 'moderate')
on conflict (id) do nothing;

insert into public.components (id, name, category, rarity, price, description, compatible_with, image_emoji, in_stock) values
  ('reinforced-mainmast', 'Reinforced Mainmast', 'rigging', 'rare', 4800000, 'A strengthened mainmast that improves durability on storm-prone long routes.', array['Frigates', 'Galleons']::text[], '⛵', true),
  ('master-culverin-bank', 'Master Culverin Bank', 'armament', 'epic', 12600000, 'A matched long-range cannon bank tuned for convoy defense and merchant escorts.', array['Merchant Galleons', 'Warships']::text[], '💣', true),
  ('astrological-compass', 'Astrological Compass', 'navigation', 'legendary', 28400000, 'A precision compass that reduces navigational uncertainty on transoceanic voyages.', array['All ships']::text[], '🧭', false),
  ('hardened-oak-plating', 'Hardened Oak Plating', 'armor', 'rare', 7900000, 'Treated oak plating that absorbs impact without excessively reducing cargo capacity.', array['Trading vessels', 'Frigates']::text[], '🛡️', true),
  ('expanded-cargo-frame', 'Expanded Cargo Frame', 'cargo', 'common', 2300000, 'A practical frame extension for captains who prioritize volume over speed.', array['Caravels', 'Merchant Galleons']::text[], '📦', true)
on conflict (id) do nothing;

insert into public.market_prices (id, item_name, category, port, price, change_percent, trend, updated_at) values
  ('pepper-lisbon', 'Pepper', 'commodities', 'Lisbon', 4250, 6.4, 'rising', '2026-10-05T01:00:00Z'),
  ('cinnamon-amsterdam', 'Cinnamon', 'commodities', 'Amsterdam', 5120, -2.8, 'falling', '2026-10-05T01:05:00Z'),
  ('master-culverin-genoa', 'Master Culverin', 'equipment', 'Genoa', 12600000, 1.2, 'rising', '2026-10-05T00:50:00Z'),
  ('adventurer-frigate-port-royal', 'Adventurer Frigate', 'ships', 'Port Royal', 48000000, 0, 'stable', '2026-10-04T23:40:00Z'),
  ('seville-townhouse', 'Seville Townhouse', 'property', 'Seville', 125000000, -4.1, 'falling', '2026-10-04T22:30:00Z')
on conflict (id) do nothing;

insert into public.leaderboard_entries (id, trader, port, profit, volume, trades) values
  ('captain-alvares', 'Captain Alvares', 'Lisbon', 842000000, 2140000000, 418),
  ('port-royal-marta', 'Port Royal Marta', 'Port Royal', 731000000, 1860000000, 502),
  ('amsterdam-jan', 'Amsterdam Jan', 'Amsterdam', 614000000, 2520000000, 367),
  ('venice-lucia', 'Venice Lucia', 'Venice', 588000000, 1120000000, 289)
on conflict (id) do nothing;

insert into public.wishlist_items (id, item_name, category, target_price, note, image_emoji) values
  ('wish-frigate', 'Adventurer Frigate', 'Ships', 45000000, 'Buy below the Port Royal average.', '🚢'),
  ('wish-culverin', 'Master Culverin Bank', 'Equipment', 11500000, 'Wait for the Genoa refit discount.', '💣')
on conflict (id) do nothing;

insert into public.watchlist_items (id, item_name, port, current_price, change_percent, note) values
  ('watch-pepper', 'Pepper', 'Lisbon', 4250, 6.4, 'Export window is open.'),
  ('watch-townhouse', 'Seville Townhouse', 'Seville', 125000000, -4.1, 'Watch for a correction.')
on conflict (id) do nothing;

insert into public.guild_storefronts (id, guild_name, motto, home_port, specialties, rating, completed_orders, image_emoji) values
  ('blue-wave-traders', 'Blue Wave Traders', 'Reliable routes, disciplined convoys.', 'London', array['Convoy escorts', 'European textiles', 'Insurance']::text[], 4.8, 1284, '🌊'),
  ('golden-compass-league', 'Golden Compass League', 'Navigation first, profit follows.', 'Lisbon', array['Expeditions', 'Instruments', 'Training']::text[], 4.6, 942, '🧭')
on conflict (id) do nothing;

insert into public.shop_items (id, name, category, price, stock, seller, description, image_emoji) values
  ('shop-frigate', 'Expedition Frigate', 'ships', 46500000, 2, 'Amsterdam Shipyard', 'A balanced expedition vessel ready for long routes.', '⛵'),
  ('shop-compass', 'Mariner''s Compass', 'equipment', 1250000, 12, 'Lisbon Instruments', 'Reliable navigation for open-water voyages.', '🧭'),
  ('shop-repair-kit', 'Hull Repair Kit', 'supplies', 280000, 48, 'Port Royal Chandler', 'Emergency hull materials for hostile routes.', '🧰'),
  ('shop-dock-office', 'Dock Office Lease', 'property', 72000000, 1, 'Seville Harbor Authority', 'A leased office beside the commercial docks.', '🏛️')
on conflict (id) do nothing;
