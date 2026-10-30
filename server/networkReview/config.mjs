// REVIEW CANDIDATE ONLY. No new authentication system and no implicit tester allowlist.
// Bind the existing host's trusted authenticated tester session, separate writable
// synthetic services and SAME frontend app-shell renderer before any approved activation.
// Current production candidate has no such binding: default-off is intentional.
export const networkReviewOptions=Object.freeze({
 enabled:false,
 origin:null,
 authorizeTester:null,
 servicesProvider:null,
 renderAppShell:null,
 privateAssetPaths:[],
 renderPrivateAsset:null
})
