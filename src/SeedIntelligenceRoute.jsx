// Keep the measured-weather payload off the homepage, news, Member and species-detail routes.
const path=typeof window!=='undefined'?window.location.pathname.replace(/\/$/,''):''
const Component=import.meta.env.SSR||['/market','/weather-evidence','/production-intelligence'].includes(path)
 ? (await import('./SeedIntelligence.jsx')).default:null
export default function SeedIntelligenceRoute(props){return Component?<Component {...props}/>:null}
