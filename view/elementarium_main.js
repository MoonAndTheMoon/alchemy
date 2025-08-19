
// Init/Data
var basicElements = ["earth","air","fire","water"]
var elements = []
var elementsByName = Object.create(null)
var merges = []
var recipesByResult = Object.create(null)
var discoveredElements = []
var missingRecipeElements = []
var missingRecipeElementsNumbered = []
var recipesByIngredient = Object.create(null)

//var refinedMerges


// Code

async function loadElements(files) {
  // The file is binary.
  // Anatomy (repeats for each element):
  // [1] 4 bytes - The n length of the word.
  // [2] n bytes - UTF-8 string with a n length from the preceding int4.
  // [3] 8x1 bytes - Category (1, 2, 3, 4), Energy/Exp, Rarity/Boosted, FE, Origin

  for ( const file of files ) {
    const bytes = await file.bytes()
    //window.test = bytes

    let offset = 0

    while (offset < bytes.length - 1) {
      // Get word length
      const wordLength = new DataView( bytes.slice(offset, offset + 4).buffer ).getInt32(0, true)
      offset += 4

      // Get word
      const word = new TextDecoder().decode( bytes.slice(offset, offset + wordLength) )
      offset += wordLength

      // Get categories
      const cat1 = new DataView( bytes.slice(offset, offset + 1).buffer ).getInt8(0)
      offset += 1
      const cat2 = new DataView( bytes.slice(offset, offset + 1).buffer ).getInt8(0)
      offset += 1
      const cat3 = new DataView( bytes.slice(offset, offset + 1).buffer ).getInt8(0)
      offset += 1
      const cat4 = new DataView( bytes.slice(offset, offset + 1).buffer ).getInt8(0)
      offset += 1

      // Dunno what this is, maybe Exp and/or Energy Cost
      const expEnergy = new DataView( bytes.slice(offset, offset + 1).buffer ).getInt8(0)
      offset += 1
      // Get rarity: 0 = Common, 1 = Rare, 2 = Epic, 3 = Legendary, 4 = Divine, 5 = Boosted (and Common)
      const rarity = new DataView( bytes.slice(offset, offset + 1).buffer ).getInt8(0)
      offset += 1
      // Get first ever: 0 = Someone else's, 1 = First Ever
      const firstEver = new DataView( bytes.slice(offset, offset + 1).buffer ).getInt8(0)
      offset += 1
      // Get origin: 0 = Basic Element, 1 = Discovered, 2 = Lootbox
      const origin = new DataView( bytes.slice(offset, offset + 1).buffer ).getInt8(0)
      offset += 1

      const element = [
        word,
        cat1,
        cat2,
        cat3,
        cat4,
        origin,
        firstEver,
        rarity,
        expEnergy
      ]

      elements.push(element)
    }
  }

  Object.assign( elementsByName, Object.groupBy( elements, el => el[0] ) )
}


async function loadMerges(files) {
  // This is a JSON-file in UTF-8
  
  for ( const file of files ) {
    const content = await file.text()
    let list = []
    try {
      list = JSON.parse(content ?? "[]")
    } catch(e) {
      console.error("Unable to parse JSON from file" + file.name)
      break
    }
    
    merges.push( ...list )
  }
  
  analyzeMerges()
  buildReachableElements()
  buildMissingIngredients()
  buildRecipesByIngredient()
}




function analyzeMerges() {
	const { groupBy, keys, values, entries } = Object
	
	// Filter merges with no result, and simplify the object content
	const merges2 = merges.map( merge => ({ result: merge.Result, recipe: merge.Elements.sort() }) ).filter( merge => merge.result )
	recipesByResult = groupBy( merges2, merge => merge.result )
	delete recipesByResult.earth
	delete recipesByResult.air
	delete recipesByResult.fire
	delete recipesByResult.water
	
	// Iterate results
	for ( const [ result, merges ] of entries(recipesByResult) ) {
		//if (result !== "springfield")
			//continue
		let elementsByElement = {}
		for ( const merge of merges ) {
			const uniqueElementsCount = values( groupBy( merge.recipe, elem => elem ) ).length
			merge.uniqueElementsCount = uniqueElementsCount
		}
		
		// Mark redundant recipes i.e. when a subset of ingredients is enough
		const recipesByUniqueElementsCount = groupBy( merges, merge => merge.uniqueElementsCount )
		for ( let i = 1; i < 4; i++ ) {
			const iRecipes = recipesByUniqueElementsCount[i] ?? []
			for ( let j = i+1; j <= 4; j++ ) {
				const jRecipes = recipesByUniqueElementsCount[j] ?? []
				for ( const iRecipe of iRecipes ) {
					for ( const jRecipe of jRecipes ) {
						if ( iRecipe.recipe.every( irec => jRecipe.recipe.includes(irec) ) ) {
							jRecipe.redundant = true
						}
					}
				}
				
			}
		}
		
		// Mark duplicate recipes
		const discoveredRecipeKeys = {}
		for ( const merge of merges ) {
			const recipeKey = merge.recipe.join()
			if ( discoveredRecipeKeys[recipeKey] ) {
				merge.duplicate = true
			}
			discoveredRecipeKeys[recipeKey] = true
		}
		
		//break
	}
	
	// Remove duplicates
	keys(recipesByResult).forEach( result => recipesByResult[result] = recipesByResult[result].filter( merge => !(merge.redundant || merge.duplicate) ) )
	
	console.log(
		merges.length, "merge results found (duplicate collection possible).",
		"\nOf those only", merges2.length, "yielded a result.",
		values(recipesByResult).flat().length, "recipes remaining after removing redundancy and duplicates."
	)
}


function buildReachableElements() {
	const { groupBy, keys, values, entries, assign } = Object
	
	const availableElements = assign( {}, recipesByResult )
	discoveredElements = {
		earth: 0,
		air: 0,
		fire: 0,
		water: 0
	}
	
	let lastCount = 0
	let level = 1
	
	while ( lastCount < keys(discoveredElements).length ) {
		lastCount = keys(discoveredElements).length
		const newDiscoveredElements = {}
		
		for ( const [element, recipes] of entries(availableElements) ) {
			for ( const recipe of recipes ) {
				if ( recipe.recipe.every( ingredient => discoveredElements[ingredient] != null ) ) {
					newDiscoveredElements[element] = level
          recipesByResult[element].level = level
          
					delete availableElements[element]
					break
				}
			}
		}
		
		assign( discoveredElements, newDiscoveredElements )
		level++
	}
	
	console.log( "Discovered:", discoveredElements )
  console.log( "Undiscovered:", availableElements )
	console.log( keys(discoveredElements).length, "elements reachable from the basic elements." )
}


function buildMissingIngredients() {
  const { keys, values, groupBy } = Object
  
  //const reachableElementNames = keys(discoveredElements)
  const collectedNames = {}
  
  for ( const result of keys(recipesByResult) ) {
    // Skip ingredients for elements that are reachable
    if ( discoveredElements[result] )
      continue
    //const collectedNamesForThisResult = {}
    for ( const recipe of recipesByResult[result] ) {
      const ingredients = recipe.recipe
      for ( const ingredient of ingredients ) {
        if ( !discoveredElements[ingredient] && !basicElements.includes(ingredient) ) {
          if ( !collectedNames[ingredient] )
            collectedNames[ingredient] = 1
          else
            collectedNames[ingredient]++
        }
      }
    }
  }
  
  // Remove ingredients that have a recipe
  for ( const ingredient of keys(collectedNames) ) {
    const recipes = recipesByResult[ingredient]
    if (recipes) {
      delete collectedNames[ingredient]
    }
  }
  
  
  missingRecipeElements = keys(collectedNames).sort( (a, b) => collectedNames[b] - collectedNames[a] )
  missingRecipeElementsNumbered = keys(collectedNames)
    .sort( (a, b) => collectedNames[b] - collectedNames[a] )
    .map( name => "[" + collectedNames[name] + "] " + name )
}


function findDiscoveredElements(pattern) {
  const checkboxState = Get("#searchUnreachableCheckbox").checked
  const list = checkboxState ? missingRecipeElementsNumbered : Object.keys(discoveredElements).sort()
  const results = list.filter( elem => elem.match(pattern) )
    .map( elem => ( ( discoveredElements[elem] ? "[" + discoveredElements[elem] + "] " : "" ) + elem ) )
  
  return results
}


function updateSearchResults() {
  const p = Get("#searchResults")
  const input = Get("#searchBar")
  
  const results = findDiscoveredElements( new RegExp( input.value ) )
  //const results = findDiscoveredElements( input.value )
  p.textContent = results.join(", ")
  
  //console.log("Input changed.")
}


function buildRecipesByIngredient() {
	//const ingred
	for ( const merge of merges ) {
		const ingredients = merge.Elements
		for ( const ingredient of ingredients ) {
			if ( !recipesByIngredient[ingredient] )
				recipesByIngredient[ingredient] = [merge]
			else {
				recipesByIngredient[ingredient].push(merge)
			}
		}
	}
}


function getDiscoveredElementsNotMergedWith(name, exactly=true) {
	const { keys, assign } = Object
	const result = assign( Object.create(null), discoveredElements )
	
	for ( const discoveredName of keys(discoveredElements) ) {
		const elementName = name === "_" ? discoveredName : name
		const recipes = recipesByIngredient[discoveredName] ?? []
		for ( const merge of recipes ) {
			const recipe = merge.Elements
			
			if ( (elementName === discoveredName && ( exactly ? recipe.filter( ingredient => ingredient === elementName ).length === 2 : recipe.filter( ingredient => ingredient === elementName ).length >= 2 )) || (elementName !== discoveredName && ( exactly ? recipe.filter( ingredient => ingredient === elementName ).length === 1 : recipe.includes(elementName) )) ) {
				delete result[discoveredName]
				break
			}
		}
	}
	
	return result
}


function getAnyElementsNotMergedWith(name, exactly=true) {
	const { keys, assign, groupBy } = Object
	const result = assign( Object.create(null), groupBy( elements, el => el[0] ) )
	
	for ( const discoveredName of keys(result) ) {
		const elementName = name === "_" ? discoveredName : name
		const recipes = recipesByIngredient[discoveredName] ?? []
		for ( const merge of recipes ) {
			const recipe = merge.Elements
			
			if ( (elementName === discoveredName && ( exactly ? recipe.filter( ingredient => ingredient === elementName ).length === 2 : recipe.filter( ingredient => ingredient === elementName ).length >= 2 )) || (elementName !== discoveredName && ( exactly ? recipe.filter( ingredient => ingredient === elementName ).length === 1 : recipe.includes(elementName) )) ) {
				delete result[discoveredName]
				break
			}
		}
	}
	
	return result
}


function downloadElements(elementNames, maxPageSize=116, maxPages=20) {
	const { keys, assign } = Object
	const { floor, random } = Math
	
	let page = 1
	
	while ( elementNames.length && page <= maxPages ) {
		const pickedElements = []
		for ( let i = 0; i <= maxPageSize && elementNames.length; i++ ) {
			const randomIndex = floor( random() * elementNames.length )
			pickedElements.push( elementNames[randomIndex] )
			elementNames.splice(randomIndex, 1)
		}
		
		const text = JSON.stringify(pickedElements)
		
		//console.log( "Name:", notMergedWithName + "_" + page )
		//console.log( "Content:", text )
		download( "elements" + "_" + page + ".txt", text )
		
		page++
	}
}


function getAverageDistanceFromBasicElements() {
	const { keys, groupBy } = Object
	const elementsByLevel = groupBy( keys(discoveredElements), key => discoveredElements[key] )
	const total = keys(discoveredElements).length
	const avg = keys(elementsByLevel).reduce( (acc, cur, i, arr) => acc + arr[i] * elementsByLevel[i].length , 0 ) / total
	
	return avg
}


function getLowestLevelRecipePath( elementName, mode, depth=0, resolvedElements=Object.create(null), resolvedRecipes=[] ) {
	if ( discoveredElements[elementName] == null )
		return
	resolvedElements[elementName] = true
	
	const recipes = recipesByResult[elementName]
		.filter( recipe => recipe.recipe.every( ingredient => discoveredElements[ingredient] != null && ingredient !== elementName ) )
		.map( recipe => ({
			name: elementName,
			ingredients: recipe.recipe.slice(),
			maxLevel: recipe.recipe.reduce( (acc, cur) => Math.max( discoveredElements[cur], acc ), 0 ),
      totalLevel: recipe.recipe.reduce( (acc, cur) => discoveredElements[cur] + acc, 0 )
		}) )
		.sort( (a, b) =>  a.maxLevel === b.maxLevel ? ( a.totalLevel - b.totalLevel ) : a.maxLevel - b.maxLevel )
	
	const recipe = recipes[0]
	delete recipe.maxLevel
	recipe.level = discoveredElements[recipe.name]
	
	for ( let i = 0; i < recipe.ingredients.length; i++ ) {
		const ingredient = recipe.ingredients[i]
		if ( resolvedElements[ingredient] || basicElements.includes(ingredient) ) {
			recipe.ingredients[i] = ingredient
		} else {
			recipe.ingredients[i] = getLowestLevelRecipePath( ingredient, mode, depth + 1, resolvedElements, resolvedRecipes )
		}
	}
	
	if (mode == null) {
		return recipe
	}
	else if ( mode === "recipes" ) {
		if (depth === 0) {
			resolvedRecipes.push( "[" + recipe.level + "] " + recipe.name + " = " + recipe.ingredients.join(" + ") )
			return resolvedRecipes.reverse().join("\n")
		}
		else {
			resolvedRecipes.push( "[" + recipe.level + "] " + recipe.name + " = " + recipe.ingredients.join(" + ") )
			return recipe.name
		}
	}
	else {
		return ""
	}
}


function getLowestLevelRecipePathV2( elementName, mode, depth=0, resolvedElements=Object.create(null), resolvedRecipes=[] ) {
	if ( discoveredElements[elementName] == null )
		return
	resolvedElements[elementName] = true
	
	const recipes = recipesByResult[elementName]
		.filter( recipe => recipe.recipe.every( ingredient => discoveredElements[ingredient] != null && ingredient !== elementName ) )
		.map( recipe => ({
			name: elementName,
			ingredients: recipe.recipe.slice(),
			maxLevel: recipe.recipe.reduce( (acc, cur) => Math.max( discoveredElements[cur], acc ), 0 ),
      totalLevel: recipe.recipe.reduce( (acc, cur) => discoveredElements[cur] + acc, 0 )
		}) )
		.sort( (a, b) =>  a.maxLevel === b.maxLevel ? ( a.totalLevel - b.totalLevel ) : a.maxLevel - b.maxLevel )
	
	const recipe = recipes[0]
	delete recipe.maxLevel
	recipe.level = discoveredElements[recipe.name]
	
	for ( let i = 0; i < recipe.ingredients.length; i++ ) {
		const ingredient = recipe.ingredients[i]
		if ( resolvedElements[ingredient] || basicElements.includes(ingredient) ) {
			recipe.ingredients[i] = ingredient
		} else {
			recipe.ingredients[i] = getLowestLevelRecipePathV2( ingredient, mode, depth + 1, resolvedElements, resolvedRecipes )
		}
	}
	
	if (mode == null) {
		return recipe
	}
	else if ( mode === "recipes" ) {
		if (depth === 0) {
			resolvedRecipes.push( recipe.name + " = " + recipe.ingredients.join(" + ") )
			return resolvedRecipes
				.reverse().join("\n").toTitleCase()
				.replaceAll( /^.+?_missing_$/gm, "" )
				.replaceAll( /= ([a-zA-Z' \-]+) \+ \1$/gm, "= << $1" )
				.replaceAll( /= ([a-zA-Z' \-]+) \+ \1 \+ \1$/gm, "= <<< $1" )
				.replaceAll( /= ([a-zA-Z' \-]+) \+ \1 \+ \1 \+ \1$/gm, "= <<<< $1" )
		}
		else {
			resolvedRecipes.push( recipe.name + " = " + recipe.ingredients.join(" + ") )
			return recipe.name
		}
	}
	else {
		return ""
	}
}


function getRecipesDiffText() {
	const text = elements.map( element => {
		const name = element[0]
		const hasRecipe = recipesByResult[name] ? true : false
		
		return ( hasRecipe ? "+" : "-" ) + name
	} ).join("\n")
	
	return text
}


function getNoRecipesElementsText() {
	const text = elements
    .filter( element => !recipesByResult[element[0]] )
    .map( element => element[0] ).join("\n")
	
	return text
}


function downloadFromCustomList(customElements) {
	// Note: customElements can be unsanitized elements
	const allElementKeys = Object.groupBy( elements, elem => elem[0] )
	const customElementsFiltered = customElements.filter( ap => allElementKeys[ap] )
	const fillersNeeded = customElementsFiltered.length % 120
	const fillers = Object.keys(allElementKeys).filter( elem => !customElementsFiltered.includes(elem) ).slice(0, fillersNeeded)
	const resultKeys = [...customElementsFiltered, ...fillers]
	
	console.log( resultKeys )
	
	//downloadElements( resultKeys, 120 )
}
//downloadFromCustomList()


function printCategoryWithRecipe( categoryId ) {
	let someElements = elements.filter( elem => [ elem[1], elem[2], elem[3], elem[4] ].includes(categoryId) )
	let someElementsDict = Object.groupBy( someElements, el => el[0] )
	
	let test = someElements.map( elem => elem[0] + ( recipesByResult[ elem[0] ] ? "\n  >> " + recipesByResult[ elem[0] ]?.[0].recipe.join(" + ") : "" ) ).join("\n").toTitleCase()
	
	console.log( test )
}


function getElementRecipes(elementName) {
  const { keys, groupBy } = Object
  
  const recipesText = merges.filter( merge => merge.Result === elementName ).map( merge => merge.Elements.slice().sort().join(" + ") )
  const groupedRecipesText = groupBy( recipesText, recipeText => recipeText )
  
  return keys(groupedRecipesText).sort().join("\n")
}


function printCatchupRecipesFromForeignRecipes() {
	const foreignElements = data.names.map( name => name.toLowerCase() )
	const foreignRecipes = data.create.map( recipes => recipes?.[0].map( i => foreignElements[i] ) )
	const foreignRecipesDict = Object.groupBy( foreignRecipes, (recipe, i) => foreignElements[i] )
	Object.keys(foreignRecipesDict).forEach( key => foreignRecipesDict[key] = foreignRecipesDict[key][0] )
	const foreignRecipesForMissingRecipesText = missingRecipeElements
		.map( missing => missing + " = " + (foreignRecipesDict[missing]?.map( x => elementsByName[x] ? x : "[" + x + "]" ).join(" + ") ?? "_missing_") )
		.join("\n").toTitleCase()
		.replaceAll( /^.+?_missing_$/gm, "" )
		.replaceAll( /= ([a-zA-Z' \-]+) \+ \1$/gm, "= << $1" )
		.replaceAll( /= ([a-zA-Z' \-]+) \+ \1 \+ \1$/gm, "= <<< $1" )
		.replaceAll( /= ([a-zA-Z' \-]+) \+ \1 \+ \1 \+ \1$/gm, "= <<<< $1" )
	
	
	console.log( foreignRecipesForMissingRecipesText )
}




// More Code

function importData(fn, multiple=true) {
  const input = Create( "input", { attr:{ type: "file", multiple} } )
  
  input.onchange = async function() {
    const files = Array.from(input.files)
    await fn(files)
    console.log("Done processing", files.length, "files.")
  }
  
  input.click()
}


function parseCSV(data, fieldSep=',', newLine='\n') {
  var nSep = '\x1D'
  var qSep = '\x1E'
  var cSep = '\x1F'
  var nSepRe = new RegExp(nSep, 'g')
  var qSepRe = new RegExp(qSep, 'g')
  var cSepRe = new RegExp(cSep, 'g')
  var fieldRe = new RegExp('(?<=(^|[' + fieldSep + '\\n]))"(|[\\s\\S]+?(?<![^"]"))"(?=($|[' + fieldSep + '\\n]))', 'g')
  var grid = []
  data.replace(/\r/g, '').replace(/\n+$/, '').replace(fieldRe, function(match, p1, p2) {
      return p2.replace(/\n/g, nSep).replace(/""/g, qSep).replace(/,/g, cSep)
  }).split(/\n/).forEach(function(line) {
      var row = line.split(fieldSep).map(function(cell) {
          return cell.replace(nSepRe, newLine).replace(qSepRe, '"').replace(cSepRe, ',')
      })
      grid.push(row)
  })
  return grid
}


async function readTestText(files) {
  
  for ( const file of files ) {
    const { name, size } = file
    
    const content = await file.text()
    window.testText = content
  }
  
}


function getExcelExport(rows, header) {
  const data = header ? [header, ...rows] : rows
  const out = data.map( row =>
    row.map( x => {
    if ( String(x).match(/["]/) )
      x = x.replaceAll('"', '""')
    if ( String(x).match(/[\r\n\t"]/) )
      x = '"' + x + '"'
    return String(x)
  } ).join("\t") ).join("\n")
  
  return out
}


function copyToClipboard(text, fileName) {
  const ta = Create("textarea", { assign:{ value:text }, style:{ position:"fixed", opacity:0, pointerEvents:"none" } } )
  document.body.append(ta)
  ta.focus()
  ta.select()
  
  const copied = document.execCommand("copy")
  ta.remove()
  
  if ( !copied ) {
    const name = typeof fileName === "string" && fileName.length ? fileName : "copy"
    //console.log("Copying failed!")
    //download(name + ".txt", text)
  }
  else
    console.log("Copied to clipboard!")
  
  return copied
}


function download(filename, text) {
  const element = document.createElement("a")
  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text))
  element.setAttribute("download", filename)

  element.style.display = "none"
  document.body.appendChild(element)

  element.click()

  document.body.removeChild(element)
}


// Add stringify/parse support for Map
(function () {
	
	function replacer(key, value) {
		if (value instanceof Map) {
			return Array.from(value.entries())
		}
		return value
	}
	
	
	if ( !Map.prototype.stringify ) {
		Map.prototype.stringify = function () {
			return JSON.stringify(this, replacer)
		}
	} else {
		console.warn("Expando Map.prototype.stringify already defined!")
	}
	
	
	if ( !JSON.parseMap ) {
		JSON.parseMap = function(string) {
			return new Map( JSON.parse(string) )
		}
	} else {
		console.warn("Expando JSON.parseMap already defined!")
	}
	
})()


function selectRandomArrayItems(arr, amount) {
	const { floor, random } = Math
  const arrCopy = arr.slice()
	
  const pickedElements = []
  for ( let i = 0; i < amount; i++ ) {
    const randomIndex = floor( random() * arrCopy.length )
    pickedElements.push( arrCopy[randomIndex] )
    arrCopy.splice(randomIndex, 1)
  }
  
  return pickedElements
}


function downloadRecipeTextFromTestString() {
	const elementLines = []
	for ( const line of testText.split("\n").slice(1) ) {
		const cells = line.split("\t")
		for ( let i = 0; i < cells.length; i += 8 ) {
			const elementLine = cells.slice(i, i + 5)
			if ( !elementLine.every( cell => !cell.length ) )
			elementLines.push( elementLine[0] + " = " + elementLine.slice(1,5).join(" + ").replace( /( \+ )+$/, "" ) )
		}
	}
	elementLines.sort()
	//download( "ABC_elements.txt", elementLines.join("\n") )
	//return elementLines.join("\n")
	
	const groupedRecipes = Object.groupBy( elementLines, line => line.toLowerCase().match( /^([0-9a-z '-]+) = / )?.[1] )
	const myMissing = myMissingElements.split("\n").map( name => groupedRecipes[name]?.[0].toLowerCase() ?? name )
	download( "missingElements.txt", myMissing.join("\n") )
	//return myMissing.join("\n")
	
}



//const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
//columnNames.sort( collator.compare )




// Group elements by their distance from the basic elements
//Object.groupBy( Object.keys(discoveredElements), key => discoveredElements[key] )

//recipesByResult["robo-dog"].map( rec => rec.recipe.join(", ") ).join("\n")

//console.log( recipesByResult["crusade"]?.map( rec => rec.recipe.join(" + ") ).join("\n") )

// Element names within a certain distance from the basic elements
//Object.entries( discoveredElements ).filter( entry => entry[1] > 0 && entry[1] < 10 ).map( entry => entry[0] )

// How many elements (%) has a recipe
//console.log( Array.from(getRecipesDiffText()).filter( char => char === "+" ).length / elements.length )
//console.log( elements.length - Array.from(getRecipesDiffText()).filter( char => char === "+" ).length )

// Download elements not merged with themselves
//downloadElements( Object.keys( getAnyElementsNotMergedWith("_") ), 120, 5 )


// Recipes per element, top list
// {
	// const group = Object.groupBy( merges, merge => merge.Result )
	// const arr = Object.entries(group)
		// .map( entry => ( { name: entry[0], count: entry[1].length } ) )
		// .sort( (a, b) => b.count - a.count )
		// .slice(1, 20).map( o => o.name + " - " + o.count )
		// .join("\n")
	
	// console.log(arr)
// }

// Download elements without a recipe
//download( "missingRecipeFor.txt", elements.map( el => el[0] ).sort().filter( name => !recipesByResult[name] && !basicElements.includes(name) ).join("\n") )

// Print recipes
// {
	// const element = `
// Spine
	// `.trim().toLowerCase()
	
	// console.log( element.toTitleCase() + ":" )
	// console.log( ( element + " = " + getElementRecipes(element).split("\n").join( "\n" + element + " = " ) ).toTitleCase() )
	// console.log( "\n\n" )
	// console.log( getLowestLevelRecipePathV2(element, "recipes")?.toTitleCase() )
// }




