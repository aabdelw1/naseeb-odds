# Search log

A Cloudflare Worker that records each settled search on naseebodds.com in a D1 database, so we
can see what people actually search for: which ages, heights and backgrounds, how many require
prayer or hijab, and how that differs between brothers and sisters.

It records **searches, not people**.

| Stored | Never stored |
| --- | --- |
| Every filter value, the estimate level and how many people the search left | IP addresses (used only to rate-limit, then dropped) |
| The hour of the search (UTC), never the minute | Cookies, accounts, names, device fingerprints |
| Country, as a two-letter code | Full user agent or referring page |
| A random id per page load, held only in memory | Anything that survives a reload |
| The optional "I'm a brother / sister / just browsing" answer | |

Worker logs are switched off (`[observability]` in `wrangler.toml`), so the rows in D1 are the
only record. The FAQ on the site promises all of this ("Does Naseeb Odds save my search?"), so
keep the two in step.

## How it fits together

- `src/lib/searchLog.ts` defines a valid entry. The app builds entries with it and the Worker
  checks them with it, so the two can't disagree. It doesn't import the model, which would be
  far too slow to load in a Worker.
- `src/lib/searchLogClient.ts` sends an entry from the live site once a search has sat still for
  two seconds, at most 60 per visit, and never for the search a shared link opened with.
- `worker/index.ts` accepts only `POST /search` from naseebodds.com, rate-limits per address,
  validates, and inserts one row.
- `worker/schema.sql` is the table, plus a `final_searches` view holding the last search of each
  visit. Use that view for preference questions, so a visitor who nudged a slider twenty times
  counts once.

## Commands

Wrangler needs Node 22, so run `nvm use` in the repo first.

```bash
npm run log:deploy            # deploy the Worker
npm run log:schema            # create or update the table (safe to re-run)
npm run log:stats             # print every saved question in worker/queries.sql
npm run log:stats -- divorced # only the questions whose title mentions "divorced"
```

Ask anything else directly:

```bash
npx wrangler@4 d1 execute naseeb-odds-searches --remote --config worker/wrangler.toml \
  --command "SELECT looking_for, COUNT(*) FROM final_searches GROUP BY 1"
```

## Reading the numbers honestly

- `looking_for` is who a search was for, not who made it. Searches for sisters come mostly from
  brothers, but also from mothers, aunties and the curious. Use `searcher` (the self-answer) when
  the question is about men versus women.
- This is what people type into a calculator for fun, and some will enter absurd standards on
  purpose. It makes great material ("the most requested height among sisters is…") but it isn't
  a survey of Muslim preferences.

To delete everything: `--command "DELETE FROM searches"`.
