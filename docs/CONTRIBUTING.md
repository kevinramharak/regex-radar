# Regex Radar – Contributing guide

## Versioning

Still need to decide on how versioning of the packages work. It is probably easier to keep all versions in sync, across all packages.

## Releases

See the [VS Code docs](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions).

- use semver
- for normal releases use `major.EVEN_NUMBER.patch`
- for pre-releases use `major.ODD_NUMBER.patch`

Also keep the releases up to date on the [releases](https://github.com/kevinramharak/regex-radar/releases/) page.

`0.x.x` releases will be considered the alpha phase.
Stable releases will start from `1.x.x`.

### Tags

Rely on the GitHub releases feature to create git tags for releases. Or use [`git tag`](https://git-scm.com/book/en/v2/Git-Basics-Tagging).

## Changelog

Start maintaining a [`CHANGELOG.md`](../CHANGELOG.md).
