-- The search log. One row per settled search on naseebodds.com. Deliberately about searches,
-- not people: there is no IP address, cookie, account or anything that outlives a page load.
-- Apply with: npm run log:schema

CREATE TABLE IF NOT EXISTS searches (
  id INTEGER PRIMARY KEY,
  hour TEXT NOT NULL,              -- UTC, to the hour only, e.g. 2026-09-21T14
  country TEXT,                    -- two-letter code from Cloudflare, or NULL
  visit TEXT NOT NULL,             -- random per page load, held only in memory
  searcher TEXT CHECK (searcher IN ('brother', 'sister', 'browsing')),  -- optional self-answer
  estimate TEXT NOT NULL,          -- conservative | realistic | generous
  looking_for TEXT NOT NULL,       -- any | male | female
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,        -- 90 means 90 and older
  ethnicities TEXT NOT NULL,       -- 'all', 'none', or the picks in order: arab,black,desi,white,other
  nativity TEXT NOT NULL,          -- same, over immigrant,secondGen,thirdGen
  marital TEXT NOT NULL,           -- same, over neverMarried,divorcedNoKids,divorcedWithKids,widowed,married
  height_min INTEGER NOT NULL,     -- inches; 56 means no lower limit
  height_max INTEGER NOT NULL,     -- inches; 80 means no upper limit
  min_education TEXT NOT NULL,     -- any | highSchool | someCollege | bachelors | graduate
  min_income INTEGER NOT NULL,     -- 0 means any
  prays INTEGER NOT NULL,          -- 1 when "prays all 5 daily" was required
  mosque INTEGER NOT NULL,
  hijab INTEGER NOT NULL,
  sects TEXT NOT NULL,             -- same, over sunni,shia,justMuslim,other
  convert_status TEXT NOT NULL,    -- any | bornMuslim | convert
  result_count INTEGER NOT NULL,   -- how many people the search left
  active_filters INTEGER NOT NULL  -- how many filters differ from the defaults
);

CREATE INDEX IF NOT EXISTS searches_by_hour ON searches (hour);
CREATE INDEX IF NOT EXISTS searches_by_audience ON searches (looking_for, searcher);
CREATE INDEX IF NOT EXISTS searches_by_visit ON searches (visit);

-- The last search of each visit: where people ended up after all their tweaking. Most
-- questions about preferences should use this rather than every intermediate search.
CREATE VIEW IF NOT EXISTS final_searches AS
SELECT * FROM searches WHERE id IN (SELECT MAX(id) FROM searches GROUP BY visit);
