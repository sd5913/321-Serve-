#!/usr/bin/env bash
set -euo pipefail

# Run this script from a checkout of protected main for preflight; after approval
# run it again from the verified commit before passing credentials to any step.
ref=$1
event_sha=$2
version_pattern='^refs/tags/v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
if [[ ! "$ref" =~ $version_pattern ]]; then
  echo 'Release tags must look like v1.2.3 with no suffixes or leading zeroes.' >&2
  exit 1
fi

# Fetch explicit refs without overwriting the checked-out work tree. Compare the
# peeled commit for annotated tags and the commit itself for lightweight tags.
git fetch --no-tags origin \
  '+refs/heads/main:refs/remotes/origin/main' \
  "+$ref:refs/release-check/tag" >&2
tag_commit=$(git rev-parse 'refs/release-check/tag^{commit}')
event_commit=$(git rev-parse --verify "$event_sha^{commit}")
if [[ "$tag_commit" != "$event_commit" ]]; then
  echo 'The remote tag no longer matches the triggering commit.' >&2
  exit 1
fi
if ! git merge-base --is-ancestor "$tag_commit" refs/remotes/origin/main; then
  echo 'The tagged commit must be reachable from main.' >&2
  exit 1
fi

printf 'version=%s\ncommit=%s\n' "${ref#refs/tags/v}" "$tag_commit"
