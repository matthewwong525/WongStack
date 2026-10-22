# Access on previews

A preview has its own sign-in list and its own practice people: this page says who signs in to previews and what they can open there. [Employee access](employee-access.md) owns the live app's people, apps and key levels.

## People who can push on GitHub

Anyone with push rights to the project on GitHub can sign in to previews, never the live app. Their code already runs on a preview, so seeing it adds little risk.

1. **Every 15 minutes, and when Access opens,** the live app reads the repository's collaborators with the GitHub key it already holds (`WONG_CODE_READ` or `WONG_CODE_WRITE`). Listing them needs only *Metadata: Read*, which every fine-grained token has. A cron trigger in `app/wrangler.jsonc` runs it; staging's schedule is empty, [as every timed job's is](staging-bindings.md#cron-triggers-inherit-omitting-them-does-not-disable-them).
2. **Each one's email comes from GitHub when it can:** their public profile email, else the author email on their own commits in the project, never a `users.noreply.github.com` address. GitHub links a commit to a login only through an address verified on that account. An unknown one is looked up again at most once an hour.
3. **When GitHub shares none,** Access lists them as *Needs an email*, and the owner or an Admin types it once. A typed email wins over a found one; clearing it lets the app look again.
4. **Their emails join [the previews app's list](cloudflare-access.md#two-private-apps-one-per-worker) alone.** The live app's list stays the owner and the people in Access. If the previews list loses them, as when [the `access` step](employee-access.md#finish-access-setup) reruns, the next read puts them back.
5. **Take away their push rights on GitHub,** and within 15 minutes their email leaves the previews list and every preview session ends. The live app's sessions stay. A pusher who is also a person in Access keeps both lists.

A failed read from GitHub changes nobody's sign-in, and Access says it couldn't reach GitHub. Without the GitHub key, or once the project leaves GitHub, the pushers already listed keep their preview sign-in until the key is back. The section shows one line instead of rows when the app holds no GitHub key, on a preview (*Live app only*), and on an install whose previews still share the live app's sign-in (*Finish Access setup*, run [the `access` step](employee-access.md#finish-access-setup)). It is hidden for a project kept in Cloudflare: people who save there hold Project code and are already on both lists. A preview never reads GitHub. Cloudflare's GitHub login matches an organization or a team, not a repository's collaborators, so emails stay the way in. [The People view](access-screens.md#three-views) shows the section.

## The practice list

A preview has its own people, roles and key levels. On staging the owner opens Access, adds people and chooses apps and levels against the preview's database, which [starts from made-up people](d1-pipeline.md#seeded-staging-production-untouched) with permissions and levels on: one role held by two people, one person with their own set, one who holds [Admin](employee-access.md#admin), and one person and one role that could only look at an app, so [the unticked notice](employee-access.md#unticked-in-an-update) shows. A preview holds no sign-in list key and makes no Cloudflare call, and the screen says the real list is untouched. [A person's panel](access-screens.md#a-panel-has-apps-and-keys) shows the [read-only look-up key](cloudflare-credentials.md#the-read-only-look-up-key) and Project code as *Live app only*, with no step to ask for.

**Whoever the previews' sign-in lets in, and the practice list does not name, gets every app and every key there, and manages nothing.** A person the list names gets what it gives them, and a removed one is refused, so the owner can still rehearse a refusal. The sign-in decides who gets in, a [GitHub pusher](#people-who-can-push-on-github) included, and a preview holds only made-up people and test keys.

## The checker on a preview

On staging and its previews, the preview checker counts as the owner: it opens Access's views and saves against the practice list, so [a preview walk](../development/browsing.md) can click through a change to Access and show pictures of it.

- **Only where `WONG_ENVIRONMENT` is `staging`.** That name is committed in `app/wrangler.jsonc`, never something a request sets. On the live app, and on a local run, a checker is refused: it keeps every app and manages nobody.
- **Nothing real is in reach.** A preview holds no sign-in-list key, makes no Cloudflare call, and its people are made up.
- **The checker no longer sees the view of someone who is not the owner** on a preview, an Admin's included; code tests cover those views, and a waiting sign-in.

Part of the [Cloudflare stack](README.md).
