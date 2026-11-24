# Few-Time Signature Challenge website

This repository publishes the [organization homepage](https://few-time-signature.github.io/). GitHub Pages serves the static files from the root of `main`.

Entrants submit a proof and an author-written summary to the challenge repository. After the Lean judge verifies a revision, its publication job updates the public write-up feed. The website reads that feed and the official scoring ledger independently. Pre-launch write-ups appear immediately after publication and carry no prize priority. The bundled JSON files provide a snapshot when the live feeds are unavailable. [Entry rules](https://github.com/few-time-signature/challenge/blob/main/RULES.md#public-write-up) · [Verified write-ups](https://github.com/few-time-signature/challenge/blob/verified-writeups/writeups.json) · [Score ledger](https://github.com/few-time-signature/challenge/blob/main/docs/scores.json)

The seven reference construction points link to their design papers. For a newly submitted result, the site uses the author's `paper_url` or the registered design's paper. Each point also links to its proof or verified submission. Pointer, keyboard and touch users can open the chart details.

To preview locally, run `python3 -m http.server` from this directory. [Licensing](LICENSE.md) · [DM Sans font license](fonts/OFL.txt)
