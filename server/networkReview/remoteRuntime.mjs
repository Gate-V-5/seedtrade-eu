import {createEntryHandler} from './entryHandler.mjs';
import {createPrivateAssetRenderer} from './privateAssets.mjs';
// Existing single-site composition only. No login, listener, SQL or activation.
import {clientFromEnvironment,remoteServices} from '../networkTransport/hostingerClient.mjs';
import {createReviewSessionBinding} from './reviewSessionBinding.mjs';
import {createNetworkReviewDispatcher,networkReviewBuildOptions} from './dispatcher.mjs';
export function composeRemoteReviewOptions({options,manifest,client}) {
 const configured=networkReviewBuildOptions(options,manifest);
 if(options.enabled===true&&options.privateAssetRoot&&(!Array.isArray(options.publicAssetRoots)||!options.publicAssetRoots.length))throw Error('PUBLIC_ASSET_ROOTS_REQUIRED');
 if(options.enabled===true&&options.privateAssetRoot)configured.renderPrivateAsset=createPrivateAssetRenderer({privateRoot:options.privateAssetRoot,publicRoots:options.publicAssetRoots||[],manifest});
 if(options.enabled!==true)return {...configured,enabled:false};
 if(!['https://seedtrade.eu','https://staging.seedtrade.eu'].includes(options.origin)||typeof options.verifyHttpsRequest!=='function'||typeof options.renderAppShell!=='function'||typeof configured.renderPrivateAsset!=='function'||!configured.privateAssetPaths.length)throw Error('REAL_HOST_REVIEW_BINDINGS_REQUIRED');
 const binding=createReviewSessionBinding({client,allowedSubjects:options.allowedSubjects,verifyHttpsRequest:options.verifyHttpsRequest,enabled:true,origin:options.origin});
 const services=remoteServices({client,resolveTester:binding.resolveTester,verifyHttpsRequest:options.verifyHttpsRequest,origin:options.origin});
 // Always derive authorization from the original verifier-backed binding; ignore any alternate authorizer supplied in options.
 const entryHandler=createEntryHandler({client,origin:options.origin,verifyHttpsRequest:options.verifyHttpsRequest,enabled:options.entryEnabled===true,invitedEmails:options.invitedEmails||[]});
 return {...configured,entryHandler,entryEnabled:options.entryEnabled===true,authorizeTester:binding.authorizeTester,reviewSessionBinding:binding,servicesProvider:async()=>services};
}
export async function createRemoteNetworkReview({options,manifest,env=process.env}) {
 if(options.enabled!==true)return createNetworkReviewDispatcher(composeRemoteReviewOptions({options,manifest}));
 // Validate host and allowlist contracts before reading keys or attempting transport.
 composeRemoteReviewOptions({options,manifest,client:{call(){throw Error('UNCONFIGURED_TRANSPORT')}}});
 if((env.MTLS_SERVER_NAME?'https://'+env.MTLS_SERVER_NAME:env.SEEDTRADE_B2B_API_ORIGIN)!=='https://b2b-api.seedtrade.eu')throw Error('EXACT_PILOT_API_ORIGIN_REQUIRED');
 const client=await clientFromEnvironment(env);
 try {const handler=createNetworkReviewDispatcher(composeRemoteReviewOptions({options,manifest,client}));handler.close=()=>client.close();return handler;}
 catch(e){client.close();throw e;}
}
