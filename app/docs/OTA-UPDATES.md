- The native app is configured for EAS Update on `@calgary-uwh/calgary-uwh` (project `8670108c-8259-43e5-8799-f1d4078577e8`). The SDK-compatible `expo-updates` client checks on launch without waiting for the network. It downloads compatible updates in the background and applies them on the next restart. The app does not force a reload during a chat, form, or practice workflow.

- Use `bunx eas-cli@27.3.0 build --profile production-simulator --platform ios` for an iOS Simulator binary that receives production OTA updates. This profile inherits the production channel and environment without incrementing the store build number. Screenshot-only builds with updates disabled, Expo Go, and Metro sessions do not verify production OTA delivery. A binary with updates disabled must be replaced before it can receive updates.

- `runtimeVersion.policy` is `fingerprint`. EAS generates a native runtime fingerprint for each build and update; a binary only loads matching updates. Adding native modules, changing native configuration or upgrading the Expo SDK requires a new native build. Ordinary compatible JavaScript, UI and bundled asset changes can ship over the air. Backend deployment and web deployment remain separate.

- Build profile: development; Update channel: development; EAS environment: development; Backend: Local Metro/developer configuration
- Build profile: preview; Update channel: preview; EAS environment: preview; Backend: Isolated beta: `healthy-kangaroo-237`
- Build profile: production; Update channel: production; EAS environment: production; Backend: Existing live club: `brainy-albatross-874`

- Preview and production each define `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_SITE_URL`, `EXPO_PUBLIC_DEMO_MODE=false` and `EXPO_PUBLIC_REVIEW_MODE=false` in the Expo project. These are public client settings, not server credentials. Resend/auth secrets stay in Convex. Preview and production publish commands always select their matching EAS environment, disable local Expo dotenv loading and clear the bundle cache.

- Existing installed binaries do not contain this update client/configuration. Create and install a new signed build before testing OTA:

```sh
cd app
bunx eas-cli@27.3.0 build --profile preview --platform ios
```

- Use `--platform android` for Android. Use the production profile for the store binary after the normal release checks. Native builds require the appropriate signing credentials and developer accounts. Expo Go/Metro reloads do not validate OTA delivery.

- The beta Convex project exists, but its backend code deployment is still pending; its auth endpoint returned HTTP 404 during this setup. Finish that deployment before distributing the preview build. Production's documented auth endpoint returned HTTP 200. Neither check establishes full native release readiness.

- From `app`, test the changes and publish to preview first:

```sh
bun run check
bun run update:preview --message "Describe the change"
```

- Install a preview binary with the matching native fingerprint. Launch online to download the update, then fully close and reopen it to apply. Depending on timing, up to two restarts may be needed. Confirm the changed behavior, then repeat offline to verify the cached update. Verify the other channel stays unchanged.

- After preview verification, publish the production group:

```sh
bun run update:production --message "Describe the verified change"
```

- A Git push alone does not publish an OTA update. The commands publish the current working tree; review its changes first. Use the same EAS environment for the build and update. If no installed binary matches the new runtime fingerprint, distribute a new native build.

- Use the EAS dashboard or `bunx eas-cli@27.3.0 update:rollback` to select the latest group to reverse for its branch and runtime. The CLI republishes the preceding group, or publishes a rollback to the embedded binary update if no earlier group exists. Keep Expo's embedded-update and error-recovery protections enabled. An app that already downloaded a release may need a restart to receive a rollback.

- Local public/native configuration resolves the Expo update URL, launch checks, zero network wait, and fingerprint policy. iOS Expo.plist and Android manifest introspection contain the update client configuration. Fingerprint generation succeeds for both platforms. The remote preview and production channels and their backend environment settings were created and checked separately.

- The complete app check passed 861 tests / 7,005 assertions, TypeScript, Biome and design/motion checks. EAS resolved the preview profile with its cloud environment, correct update URL and fingerprint policy.

- No native cloud build or OTA release was published by this setup. Actual download/application/offline/rollback testing remains a device acceptance step after the first new binary.

- Sources: [Expo setup](https://docs.expo.dev/eas-update/getting-started/), [runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/), [environment selection](https://docs.expo.dev/eas/environment-variables/usage/), [SDK update behavior](https://docs.expo.dev/versions/v57.0.0/sdk/updates/).
