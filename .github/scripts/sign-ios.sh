#!/usr/bin/env bash
set -euo pipefail
umask 077

for setting in APPLE_TEAM_ID DISTRIBUTION_P12 DISTRIBUTION_PASSWORD PROVISIONING_PROFILE BUILD_NUMBER MARKETING_VERSION IPA_DIR; do
  if [[ -z "${!setting:-}" ]]; then
    echo "::error::Missing TestFlight configuration: $setting"
    exit 1
  fi
done
[[ "$APPLE_TEAM_ID" =~ ^[A-Z0-9]{10}$ ]]
[[ "$BUILD_NUMBER" =~ ^[1-9][0-9]{0,3}\.[0-9]{1,2}\.[0-9]{1,2}$ ]]
[[ "$MARKETING_VERSION" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]
bundle_id=org.5913.321serve

work="$(mktemp -d "$RUNNER_TEMP/321-serve-signing.XXXXXX")"
keychain="$work/signing.keychain-db"
installed_profile=
original_keychains=()
while IFS= read -r line; do
  original_keychains+=("$(echo "$line" | tr -d '"' | sed 's/^[[:space:]]*//')")
done < <(security list-keychains -d user)

cleanup() {
  if (("${#original_keychains[@]}")); then
    security list-keychains -d user -s "${original_keychains[@]}" || true
  fi
  security delete-keychain "$keychain" 2>/dev/null || true
  if [[ -n "$installed_profile" ]]; then rm -f "$installed_profile"; fi
  rm -rf "$work"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf '%s' "$DISTRIBUTION_P12" | base64 -D > "$work/distribution.p12"
printf '%s' "$PROVISIONING_PROFILE" | base64 -D > "$work/app.mobileprovision"
unset DISTRIBUTION_P12 PROVISIONING_PROFILE

security cms -D -i "$work/app.mobileprovision" > "$work/profile.plist"
profile_uuid="$(python3 - "$work/profile.plist" "$APPLE_TEAM_ID" "$bundle_id" <<'PY'
import datetime
import plistlib
import sys
import uuid

path, team, bundle_id = sys.argv[1:]
with open(path, 'rb') as source:
    profile = plistlib.load(source)
entitlements = profile["Entitlements"]
assert profile["TeamIdentifier"] == [team], "Wrong provisioning team"
prefix, _, application_id = entitlements["application-identifier"].partition(".")
assert application_id == bundle_id and prefix in profile["ApplicationIdentifierPrefix"], "Wrong provisioning app ID"
assert not entitlements.get("get-task-allow"), "Development profile"
assert "ProvisionedDevices" not in profile and not profile.get("ProvisionsAllDevices"), "Expected App Store distribution profile"
assert profile["ExpirationDate"] > datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None), "Expired profile"
profile_uuid = profile["UUID"]
assert str(uuid.UUID(profile_uuid)) == profile_uuid.lower(), "Invalid provisioning profile UUID"
print(profile_uuid)
PY
)"
profiles="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
mkdir -p "$profiles"
profile_path="$profiles/$profile_uuid.mobileprovision"
test ! -e "$profile_path"
installed_profile="$profile_path"
cp "$work/app.mobileprovision" "$installed_profile"

keychain_password="$(openssl rand -hex 32)"
security create-keychain -p "$keychain_password" "$keychain"
security set-keychain-settings -lut 2400 "$keychain"
security unlock-keychain -p "$keychain_password" "$keychain"
security import "$work/distribution.p12" -k "$keychain" -P "$DISTRIBUTION_PASSWORD" -T /usr/bin/codesign
unset DISTRIBUTION_PASSWORD
rm -f "$work/distribution.p12"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$keychain_password" "$keychain" >/dev/null
security list-keychains -d user -s "$keychain" "${original_keychains[@]}"
distribution_identities="$(security find-identity -v -p codesigning "$keychain" | awk '/Apple Distribution:/ {print $2}')"
distribution_identity="$(python3 - "$work/profile.plist" "$distribution_identities" <<'PY'
import hashlib
import plistlib
import sys

path, identities = sys.argv[1:]
with open(path, 'rb') as source:
    certificates = plistlib.load(source)["DeveloperCertificates"]
# macOS security reports the identity fingerprint in SHA-1.
profile_identities = {hashlib.sha1(certificate).hexdigest().upper() for certificate in certificates}
matching = profile_identities.intersection(identities.split())
assert len(matching) == 1, "Expected exactly one matching Apple Distribution identity"
print(matching.pop())
PY
)"

xcodebuild archive -project ios/App/App.xcodeproj -scheme App \
  -clonedSourcePackagesDirPath "$RUNNER_TEMP/321-serve-spm" \
  -disableAutomaticPackageResolution -skipPackageUpdates \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$work/321-Serve.xcarchive" \
  MARKETING_VERSION="$MARKETING_VERSION" CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  SERVE_SIGN_STYLE=Manual SERVE_SIGN_IDENTITY="$distribution_identity" \
  SERVE_TEAM_ID="$APPLE_TEAM_ID" SERVE_PROFILE_UUID="$profile_uuid"
app="$work/321-Serve.xcarchive/Products/Applications/App.app"
test -s "$app/public/index.html"
test "$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$app/Info.plist")" = "$bundle_id"
test "$(/usr/libexec/PlistBuddy -c 'Print CFBundleVersion' "$app/Info.plist")" = "$BUILD_NUMBER"
test "$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$app/Info.plist")" = "$MARKETING_VERSION"
test "$(/usr/libexec/PlistBuddy -c 'Print CFBundleDisplayName' "$app/Info.plist")" = '321 Serve'
codesign --verify --strict --deep "$app"

python3 - "$work/export.plist" "$APPLE_TEAM_ID" "$bundle_id" "$profile_uuid" "$distribution_identity" <<'PY'
import plistlib
import sys

path, team, bundle_id, profile, identity = sys.argv[1:]
with open(path, 'wb') as output:
    plistlib.dump({
        "method": "app-store-connect",
        "destination": "export",
        "signingStyle": "manual",
        "signingCertificate": identity,
        "teamID": team,
        "provisioningProfiles": {bundle_id: profile},
        "manageAppVersionAndBuildNumber": False,
    }, output)
PY

test ! -e "$IPA_DIR"
xcodebuild -exportArchive -archivePath "$work/321-Serve.xcarchive" \
  -exportOptionsPlist "$work/export.plist" -exportPath "$IPA_DIR"
shopt -s nullglob
ipas=("$IPA_DIR/"*.ipa)
test "${#ipas[@]}" -eq 1
test -s "${ipas[0]}"
if [[ "${ipas[0]}" != "$IPA_DIR/321-Serve.ipa" ]]; then
  mv "${ipas[0]}" "$IPA_DIR/321-Serve.ipa"
fi
