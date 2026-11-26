#!/usr/bin/env bash
set -euo pipefail

# Resolve the pinned Swift package before exposing any Apple signing material.
npm ci --ignore-scripts
npm run ios:sync
xcodebuild -version
sdk=$(xcrun --sdk iphoneos --show-sdk-version)
(( ${sdk%%.*} >= 26 ))

packages="$RUNNER_TEMP/321-serve-spm"
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App \
  -clonedSourcePackagesDirPath "$packages"
# Capacitor Swift PM 8.6.3.
test "$(git -C "$packages/checkouts/capacitor-swift-pm" rev-parse HEAD)" = \
  e2c1be47d0dfe249c2f1659a54c9dc0875beaf64
