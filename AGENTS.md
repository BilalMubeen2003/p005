# Project repository policy

- Treat `https://github.com/DDH-Summer-Internship-LUMS/P005.git` as the canonical repository (`origin`).
- Mirror every completed, committed code change to `https://github.com/BilalMubeen2003/p005.git` (`vercel-repo`) so the repository associated with the Vercel workflow stays in sync. The former `BilalMubeen2001/p005` URL redirects here.
- Push the current branch to the same-named branch on both remotes. Never force-push unless the user explicitly requests it.
- Before reporting a push as complete, verify that both remote branch heads match the local `HEAD`.
- The production application is `https://p005-six.vercel.app`. A Git push does not currently trigger Vercel automatically; deploy production changes explicitly when the user requests a deployment.
