# iOS and TestFlight for 321 Serve

The iOS target uses Capacitor 8 and bundles the same root [index.html](../../index.html) that players open in a browser. The Xcode display name is **321 Serve**, and the bundle ID is **`org.5913.321serve`**. The app supports iOS 17 and later and loads its assets from its own bundle.

## Build and play locally

Use Node 22 or later and Xcode 26 or later on macOS. In the repository root, run:

```sh
npm ci --ignore-scripts
npm run ios:sync
npx cap open ios
```

Run the **App** scheme on an iPhone simulator. Wait for **Select level**, choose **Rice Rice Baby**, and tap **Start → Got It**. Play through the tutorial or use **Skip Tutorial** to enter the level. Tap the left and right halves of the game and check pinch and sweep audio, then pause and resume. Repeat on a physical device with Wi-Fi and cellular disabled to check offline playback and touch timing. The Playwright smoke test uses the copied Capacitor resources to exercise the buttons, touch events and Web Audio. The PR simulator job builds and launches the native app and includes a screenshot of startup. [Capacitor iOS documentation](https://capacitorjs.com/docs/ios)

Update the asset list in [stage-ios.mjs](../../scripts/stage-ios.mjs) when the root entry adds runtime files. `npm run ios:sync` stages and copies them into the checked-in Xcode project. Capacitor’s platform generator applies Android package naming rules, so use the existing iOS target when syncing the numeric bundle ID. The PR workflow runs through `pull_request` with read-only access and has no deployment environment or Apple credentials.

## Protect the release path before enabling it

1. A repository administrator must protect **`main`** with an active branch ruleset. The branch was unprotected when this was prepared. Require a pull request and at least one independent approval, dismiss stale approvals, require both iOS PR validation jobs, disallow force pushes and deletion, and disable bypass. Apply this to `main` directly. The release validator checks the effective rules for the required approval and verifies that the tag commit is an ancestor of the remote `main`. Start with a reviewed merge that includes this workflow. [GitHub branch rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
2. Add active tag rulesets targeting **`v*`**. Restrict creation to trusted release operators. Use a separate rule to restrict updates and deletions without a routine bypass, so the creation role cannot move or remove existing tags. GitHub uses bypass actors to grant exceptions to its creation restriction. Use the narrowest actor the repository supports. [GitHub tag rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
3. Under **Settings → Environments**, create **`serve-testflight`**. Under **Selected branches and tags**, add one **tag** rule, **`v[0-9]*`**, with no branch rules. GitHub uses a glob here. The workflow applies exact `vMAJOR.MINOR.PATCH` syntax, requires a new protected tag, and checks that the remote tag still points to the triggering commit. [GitHub environment rules](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
4. Set **Required reviewers** to a trusted repository administrator and turn off **Allow administrators to bypass configured protection rules**. Optionally enable **Prevent self-review** when the release operator who pushes the tag is a different person from the reviewing administrator. Keep the release switch unset or `false` until setup is complete. [GitHub deployment approval](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments)

## Prepare the Apple credentials

- Confirm the existing App Store Connect **321 Serve** record uses **`org.5913.321serve`**. The Apple Developer **Account Holder or Admin** creates or identifies a valid **Apple Distribution** certificate and makes an **App Store Connect** distribution profile for this exact App ID, selecting that certificate. For a new certificate, generate its CSR in Keychain Access, create and download the certificate under **Certificates, Identifiers & Profiles → Certificates**, and install it in the keychain with its private key. In Keychain Access **My Certificates**, export the certificate and private key together as a password-protected **`.p12`**. In **Profiles**, create or download the exact matching **`.mobileprovision`** file. Find the separate **10-character Apple Team ID** in the Developer account membership details. [Apple signing identity export](https://developer.apple.com/documentation/xcode/sharing-your-teams-signing-certificates) · [App Store Connect provisioning profiles](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/) · [Apple Team ID](https://developer.apple.com/help/glossary/team-id/)
- The **Account Holder** requests App Store Connect API access if needed. Give the upload account the **Developer** role, **321 Serve only** under app access, and permission to generate an individual API key. The uploader opens **Edit Profile → Individual API Key**, generates the key, downloads its **`.p8`** once, and copies the full **12-character Key ID**. The upload is authenticated with that individual key and its ID. It uses an ES256 JWT with `sub: user` and `aud: appstoreconnect-v1`. A team API key has a different token format and is outside this workflow. [Apple API access and individual keys](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api) · [Apple JWT claims](https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests)
- The **certificate and profile** sign and authorize the app binary. The **Team ID** identifies the Apple Developer membership for signing. The **individual key ID** identifies the upload credential, and the **`.p8`** signs the upload token. Keep each value in its corresponding entry.

Enter these under **Settings → Environments → serve-testflight**:

| Entry | Kind | Value |
| --- | --- | --- |
| `SERVE_DISTRIBUTION_P12_BASE64` | Environment secret | Single-line base64 of the Apple Distribution `.p12` |
| `SERVE_DISTRIBUTION_P12_PASSWORD` | Environment secret | Password chosen at export |
| `SERVE_PROVISIONING_PROFILE_BASE64` | Environment secret | Single-line base64 of the matching `.mobileprovision` |
| `SERVE_ASC_INDIVIDUAL_KEY_BASE64` | Environment secret | Single-line base64 of the uploader’s `.p8` |
| `SERVE_APPLE_TEAM_ID` | Environment variable | 10-character Apple Team ID |
| `SERVE_ASC_INDIVIDUAL_KEY_ID` | Environment variable | Exact 12-character individual API Key ID |

For each binary or key file on a trusted Mac, substitute the local filename and copy its encoding directly into the corresponding GitHub secret:

```sh
base64 < '/local/path/to/AppleDistribution.p12' | tr -d '\n' | pbcopy
base64 < '/local/path/to/321Serve.mobileprovision' | tr -d '\n' | pbcopy
base64 < '/local/path/to/AuthKey.p8' | tr -d '\n' | pbcopy
```

Run each command immediately before pasting its value. Keep the original files and password in secure storage. Clear the clipboard after setup and keep credential material out of commits, PR text and logs.

## First authorized release

1. After the students merge the reviewed PR and the protections and Apple entries are in place, add **`SERVE_TESTFLIGHT_ENABLED=true`** under **Settings → Secrets and variables → Actions → Variables** at the **repository** level. Unset or `false` disables the release before any environment job becomes eligible. Setting it to `true` alone starts no run.
2. The app owner reviews encryption usage for the actual release commit and documents the decision. The packaging review found local Web Audio and game assets, local browser storage, and Web Crypto SHA-256 for existing audio fingerprints. Review the pinned Capacitor/WebKit usage and any changes since this review. This PR leaves `ITSAppUsesNonExemptEncryption` unset. An Account Holder, Admin or App Manager can record the applicable answer and submit any required documentation in App Store Connect when prompted. [Apple export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/)
3. The authorized release operator verifies the target commit belongs to reviewed `main`, confirms the intended version is available in App Store Connect, then creates and pushes one new strict version tag such as `v1.0.0`. The tag supplies the marketing version. A run and its retries receive distinct build numbers. Routine pushes and PRs only exercise the unsigned checks when applicable.
4. In **Actions → Upload 321 Serve to TestFlight**, confirm **Validate new release tag** passed for the expected commit. The configured reviewer opens **Review deployments**, selects **`serve-testflight`**, independently checks the tag and commit, then selects **Approve and deploy**. The signed job checks the tag again before preparing Xcode and exposing signing material.
5. Check the run’s **Artifacts** for the signed **`321-Serve.ipa`** and the upload step for the App Store Connect upload ID. The artifact is available for seven days and is produced before the Apple upload. The upload creates an Apple build upload and file reservation, transfers the IPA bytes, then commits the file. A successful submission starts Apple processing. Check **App Store Connect → 321 Serve → TestFlight** for the matching version and build after processing, resolve any compliance prompts, and assign testers as appropriate. [Apple build uploads API](https://developer.apple.com/documentation/appstoreconnectapi/build-uploads) · [Apple build processing](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
6. If export succeeded and upload failed or its result is uncertain, inspect the workflow and check TestFlight before rerunning the failed job. A retry uses a new build number for the same tag. Keep released tags immutable. Set the release switch to `false` when you need to suspend signed releases.

Release workflow references are [Pixel Paws #33](https://github.com/sd5913/Pixel-Paws/pull/33), [Pixel Paws #39](https://github.com/sd5913/Pixel-Paws/pull/39) and [BothPls #18](https://github.com/sd5913/The-Aliien-Repo/pull/18).
