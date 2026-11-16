const rows=[
 ['barley','Gerste','Orge','Cebada','Orzo'],['chickpeas','Kichererbsen','Pois chiches','Garbanzos','Ceci'],
 ['lentils','Linsen','Lentilles','Lentejas','Lenticchie'],['maize','Mais','Maïs','Maíz','Mais'],
 ['oilseeds','Ölsaaten','Oléagineux','Oleaginosas','Semi oleosi'],['peas','Erbsen','Pois','Guisantes','Piselli'],
 ['perennial ryegrass','Deutsches Weidelgras','Ray-grass anglais','Raigrás inglés','Loietto perenne'],
 ['potatoes','Kartoffeln','Pommes de terre','Patatas','Patate'],['rapeseed','Raps','Colza','Colza','Colza'],
 ['seed potatoes','Pflanzkartoffeln','Plants de pomme de terre','Patata de siembra','Patate da seme'],
 ['white clover','Weißklee','Trèfle blanc','Trébol blanco','Trifoglio bianco'],['winter wheat','Winterweizen','Blé d’hiver','Trigo de invierno','Frumento invernale']
]
export function newsCropLabel(value,language){const row=rows.find(r=>r[0]===value);return row?.[({EN:0,DE:1,FR:2,ES:3,IT:4})[language]]||value}
