-- Saved questions for the search log. `npm run log:stats` runs them all against the live
-- database; `npm run log:stats -- height` runs only those whose title mentions "height".
-- Each one starts with "-- name:". Preference questions use final_searches (the last search of
-- each visit) so a visitor who tweaked a slider twenty times counts once.
--
-- "looking_for" is who the search was for (female = sisters, male = brothers). "searcher" is
-- the optional self-answer, which is the only reliable way to tell who made the search.

-- name: Overview
SELECT COUNT(*) AS searches, COUNT(DISTINCT visit) AS visits,
  MIN(hour) AS first_hour, MAX(hour) AS last_hour
FROM searches;

-- name: Searches per day
SELECT substr(hour, 1, 10) AS day, COUNT(*) AS searches, COUNT(DISTINCT visit) AS visits
FROM searches GROUP BY day ORDER BY day DESC LIMIT 30;

-- name: Who searches for whom
SELECT COALESCE(searcher, 'unanswered') AS searcher, looking_for, COUNT(*) AS visits
FROM final_searches GROUP BY 1, 2 ORDER BY visits DESC;

-- name: How often each requirement is set
SELECT COALESCE(searcher, 'unanswered') AS searcher, looking_for, COUNT(*) AS visits,
  ROUND(100.0 * AVG(prays), 1) AS pct_prays_5,
  ROUND(100.0 * AVG(mosque), 1) AS pct_mosque,
  ROUND(100.0 * AVG(CASE WHEN looking_for = 'female' THEN hijab END), 1) AS pct_hijab,
  ROUND(100.0 * AVG(height_min > 56 OR height_max < 80), 1) AS pct_height,
  ROUND(100.0 * AVG(min_education != 'any'), 1) AS pct_education,
  ROUND(100.0 * AVG(min_income > 0), 1) AS pct_income,
  ROUND(100.0 * AVG(ethnicities != 'all'), 1) AS pct_background,
  ROUND(100.0 * AVG(sects != 'all'), 1) AS pct_sect
FROM final_searches GROUP BY 1, 2 ORDER BY visits DESC;

-- name: Most common age ranges
SELECT looking_for, ages, visits FROM (
  SELECT looking_for, age_min || '-' || age_max AS ages, COUNT(*) AS visits,
    ROW_NUMBER() OVER (PARTITION BY looking_for ORDER BY COUNT(*) DESC) AS place
  FROM final_searches WHERE NOT (age_min = 0 AND age_max = 90)
  GROUP BY looking_for, ages
) WHERE place <= 8 ORDER BY looking_for, visits DESC;

-- name: Minimum height asked for
SELECT looking_for, (height_min / 12) || '''' || (height_min % 12) || '"' AS at_least, COUNT(*) AS visits
FROM final_searches WHERE height_min > 56
GROUP BY looking_for, height_min ORDER BY looking_for, visits DESC;

-- name: Backgrounds picked
WITH picks(background) AS (VALUES ('arab'), ('black'), ('desi'), ('white'), ('other'))
SELECT looking_for, background, COUNT(*) AS visits
FROM final_searches JOIN picks ON instr(',' || ethnicities || ',', ',' || background || ',') > 0
WHERE ethnicities NOT IN ('all', 'none')
GROUP BY looking_for, background ORDER BY looking_for, visits DESC;

-- name: Open to someone divorced
SELECT looking_for, COUNT(*) AS visits,
  ROUND(100.0 * AVG(marital = 'all' OR instr(marital, 'divorcedNoKids') > 0), 1) AS pct_ok_no_kids,
  ROUND(100.0 * AVG(marital = 'all' OR instr(marital, 'divorcedWithKids') > 0), 1) AS pct_ok_with_kids
FROM final_searches GROUP BY looking_for;

-- name: Education and income minimums
SELECT looking_for, 'education' AS kind, min_education AS minimum, COUNT(*) AS visits
FROM final_searches WHERE min_education != 'any' GROUP BY looking_for, min_education
UNION ALL
SELECT looking_for, 'income', '$' || (min_income / 1000) || 'k+', COUNT(*)
FROM final_searches WHERE min_income > 0 GROUP BY looking_for, min_income
ORDER BY 1, 2, 4 DESC;

-- name: How small people make their pool
SELECT looking_for,
  CASE WHEN result_count = 0 THEN '0 people' WHEN result_count < 100 THEN 'under 100'
       WHEN result_count < 1000 THEN '100 to 999' WHEN result_count < 10000 THEN '1k to 10k'
       ELSE '10k or more' END AS pool,
  COUNT(*) AS visits
FROM final_searches
GROUP BY looking_for, pool ORDER BY looking_for, MIN(result_count);

-- name: Countries
SELECT COALESCE(country, '?') AS country, COUNT(DISTINCT visit) AS visits
FROM searches GROUP BY 1 ORDER BY visits DESC LIMIT 15;
