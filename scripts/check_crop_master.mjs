import fs from "node:fs"
import assert from "node:assert/strict"
import React from "react"
import {renderToString} from "react-dom/server"
import {JSDOM} from "jsdom"
import {createServer} from "vite"
const summary=JSON.parse(fs.readFileSync("src/generated/crop_master_summary.json","utf8"))
const vite=await createServer({appType:"custom",server:{middlewareMode:true},logLevel:"error"})
try {
 const {default:App}=await vite.ssrLoadModule("/src/AppV2.jsx")
 const {translate}=await vite.ssrLoadModule("/src/i18n/index.jsx")
 for(const language of ["EN","DE","FR","ES","IT","UNKNOWN"]){
  global.window={location:{pathname:"/"}}
  const doc=new JSDOM(renderToString(React.createElement(App,{initialLanguage:language}))).window.document
  const kpi=doc.querySelector(".hero-coverage > div")
  assert.equal(kpi.querySelector("strong").textContent,String(summary.distinct_seed_species))
  assert.equal(kpi.querySelector("span").textContent,translate(language,"seed species"))
  assert.equal(kpi.getAttribute("title"),translate(language,"Identified seed species; analytical coverage varies by species."))
  assert.equal(doc.querySelectorAll(".intelligence-commercial > article").length,3)
  global.window={location:{pathname:"/methodology"}}
  const method=new JSDOM(renderToString(React.createElement(App,{initialLanguage:language}))).window.document
  assert.equal(method.querySelector('a[download]').getAttribute("href"),"/data/crop-master-v1.json")
 }
 console.log("Crop Master KPI and coverage download: EN/DE/FR/ES/IT/fallback SSR PASS; three approved homepage cards retained. No rendered visual QA assertion.")
}finally{await vite.close()}
