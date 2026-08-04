# Deploying Alfvenica with GitHub Pages

This repository is prepared for branch-based GitHub Pages deployment from `main` and `/ (root)`. Branch deployment is deliberately used because Alfvenica is already a static application and requires no build step in production.

## 1. Create the repository

1. Sign in to GitHub as `mkchettri8`.
2. Create a **public** repository named `alfvenica`.
3. Do not initialise it with a README, `.gitignore`, or licence; those files are already included here.
4. Upload the **contents** of this folder to the repository root and commit to `main`.

The expected repository address is:

`https://github.com/mkchettri8/alfvenica`

## 2. Run the tests

The included GitHub Actions workflow runs `npm test` after every push and pull request. Confirm that the **Tests** workflow is green before enabling the custom domain.

## 3. Enable GitHub Pages

1. Open the repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/ (root)**.
5. Save and wait for the default Pages address to appear.

## 4. Verify domain ownership first

1. Open your GitHub **profile Settings**, not repository Settings.
2. Select **Pages → Add a domain**.
3. Enter `alfvenica.org`.
4. GitHub will provide a TXT record name and value.
5. Add that exact TXT record in the domain's DNS manager and keep it permanently.
6. Return to GitHub and click **Verify** after propagation.

## 5. Add the custom domain in the repository

In **Repository Settings → Pages**, enter:

`alfvenica.org`

and save it before changing the public DNS records. The repository already contains a matching `CNAME` file.

## 6. DNS records

At the domain registrar, remove only conflicting parking/forwarding records for `@` or `www`. Do not remove nameserver, SOA, mail, or domain-verification records.

Add these four apex A records:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | 1 hour/default |
| A | `@` | `185.199.109.153` | 1 hour/default |
| A | `@` | `185.199.110.153` | 1 hour/default |
| A | `@` | `185.199.111.153` | 1 hour/default |

Add the `www` record:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `www` | `mkchettri8.github.io` | 1 hour/default |

Do not point `www` to `alfvenica.org`; point it directly to `mkchettri8.github.io`.

IPv6 AAAA records are optional. Do not add wildcard records such as `*.alfvenica.org`.

## 7. Enable HTTPS

DNS propagation can take several hours and occasionally up to 24–48 hours. When GitHub reports that the DNS check is successful, enable **Enforce HTTPS** in Repository Settings → Pages.

The final addresses should be:

- `https://alfvenica.org/`
- `https://www.alfvenica.org/` → redirects to the apex domain

## 8. First release and DOI

After the site is stable:

1. Create a Git tag and GitHub release named `v1.0.0`.
2. Archive that release with Zenodo.
3. Add the resulting DOI to `CITATION.cff`, the README, and the About page.
4. Run the tests again and release `v1.0.1` only if metadata changes require a new software version.

## Updating the site later

Edit files on a branch, run the tests, merge into `main`, and GitHub Pages will redeploy automatically. Keep formula changes separate from visual or metadata changes and record every release in `CHANGELOG.md`.
