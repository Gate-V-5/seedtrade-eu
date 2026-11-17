// UI percentages and assumptions only; all calculations remain in the existing engine.
export const scenarioDefaults=Object.freeze({production:100,productionWidth:20,demand:100,stock:100,imports:100,exports:100,variation:20,harvestLow:50,harvestBase:70,harvestHigh:90,yield:250,yieldWidth:20,bridge:true})
const bounds={production:[0,200],productionWidth:[0,100],demand:[0,200],stock:[0,200],imports:[0,200],exports:[0,200],variation:[0,100],harvestLow:[0,100],harvestBase:[0,100],harvestHigh:[0,100],yield:[0,5000],yieldWidth:[0,100]}
export function validScenario(value){
 if(typeof value==='string'){if(value.length>2000)return {};try{value=JSON.parse(value)}catch{return {}}}
 if(!value||typeof value!=='object'||Array.isArray(value))return {}
 const result={}
 for(const [key,[min,max]]of Object.entries(bounds))if(Object.hasOwn(value,key)&&typeof value[key]==='number'&&Number.isFinite(value[key])&&value[key]>=min&&value[key]<=max)result[key]=value[key]
 if(Object.hasOwn(value,'bridge')&&typeof value.bridge==='boolean')result.bridge=value.bridge
 return result
}
export function scenarioOptions(selection){
 const v={...scenarioDefaults,...validScenario(selection.scenario)}
 return {productionMultiplier:{low:v.production/100*(1-v.productionWidth/100),base:v.production/100,high:v.production/100*(1+v.productionWidth/100)},domesticUseMultiplier:{low:.009*v.demand,base:.01*v.demand,high:.011*v.demand},stockContinuity:v.stock/100,weatherSensitivity:selection.weatherSensitivity||0,importScale:v.imports/100,exportScale:v.exports/100,seasonalVariation:v.variation/100,useScopeBridge:v.bridge,harvestShare:{low:v.harvestLow/100,base:v.harvestBase/100,high:v.harvestHigh/100},marketableYieldKgHa:{low:v.yield*(1-v.yieldWidth/100),base:v.yield,high:v.yield*(1+v.yieldWidth/100)}}
}
