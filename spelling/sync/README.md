# Spelling progress sync

Works like BlitzWord's encrypted progress mirror, without a server:

1. The app (spelling/index.html) encrypts the whole saved state of the iPad (both children) with the
   public key in `public.jwk.json` (ECDH P-256 + AES-256-GCM, gzip) and posts it to a private ntfy.sh
   channel: when the app opens or resumes, after each checked round, when it goes to the background
   and every 2 minutes while progress changes. Unchanged progress isn't sent again, except on opening.
2. The "Spelling progress collect" workflow runs every 20 minutes, picks up new files (ntfy.sh keeps
   them 3 hours) and writes the newest per iPad to the `progress-data` branch: `devices/<device>.enc.json`
   and `latest.enc.json`. It cannot read them.
3. The private reading key is in the claude.ai project "Juna Reading App" (doc
   `claude/spelling-sync-reading-key.md`), never in GitHub. Read with
   `node spelling/tools/read_progress.mjs <file> < key.jwk`, or `--export juna|artus` for a file the
   parent view's "Restore from a saved file" accepts.

The progress on the iPad stays the one the app uses; sync never changes it.
Limits: no internet means no copy until the next time the app is open online. GitHub pauses scheduled
workflows in a repository with no activity for 60 days. Anyone who reads the app code can post junk to
the channel, but can't read the copies; files that don't decrypt are ignored by the reader.
