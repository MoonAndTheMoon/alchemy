

// Globals

var elementsByName = new Map()
var searchMethods = [fuzzySearch, containsSearch, startsWithSearch, endsWithSearch, regExpSearch]
var searchMethod = fuzzySearch
var limit = 100


// Game Event

var eventName = "❄️ Winter 🌲"
var eventBackgroundColor = "#29abf9"
var eventFontColor = "white"
var eventBorderColor = "white"
var eventElements = ["2025","ornament","snowman hat","tinsel garland","holiday gourmet","candyfloss","christmas ornament","new year celebration","party hat","saturnalia","tinsel","christmas","magi","sleigh","sugarplum","christmas gift","festive mug","valentine's day","june","santa claus","carol song","holiday","winter landscape","yuletide","reindeer hoof","nutcracker","sweater","winter snowflake","santa workshop","alice's dream","mistletoe branch","coal","tradition","wreath","celebration spark","twelve","holly bush","santa sleigh","fa-la-la","final countdown","present","glitter","eve","celebration","mistletoe","santa beard","fiery cup","christmas stocking","family","christmas carol","new year","stocking","snowball","santa surprise","new year toast","holiday shimmer","truth","new year confetti","angel","new year resolution","december","blitzen","winter","glittering ornament","holiday fireplace","reindeer hoofprint","wish","ice skate","candle","cherry ornament","ornament hook","rudolph","holiday cheer","donner","holiday spirit","vixen","frostbite","festivus","hotel lobby","wrapping","chestnut roast","cookie","party","new year fireworks","excitement","chimney","snowflake","winter coat","reindeer","caroler","specialty cookie","santa hat","fruitcake","wrap","magic","chimney sweep","winter gloves","fireworks","toy","new year countdown","dreamception","caroling","yule","jingle bell","new year party"]


// Actions

function sortSolutionsAscending() {
  Replace( Get("#solutions"), Array.from(Get("#solutions").children).sort( (a,b) => a.dataset.id > b.dataset.id ) )
}

function sortSolutionsDescending() {
  Replace( Get("#solutions"), Array.from(Get("#solutions").children).sort( (a,b) => a.dataset.id < b.dataset.id ) )
}

function reverseSolutions() {
  Replace( Get("#solutions"), Array.from(Get("#solutions").children).reverse() )
}

function clearAllSolutions() {
  Replace( Get("#solutions") )
}


// Add UI

{
  const titleRow = Create( "div", { assign:{ id: "titleRow" } } )
  document.querySelector("body > div.container").prepend( titleRow )

  const h1 = Create( "h1", { assign:{ innerText: "Element search" } } )
  Append( titleRow, h1 )
  
  // Acton Menu
  const actionItems = [
    { name: "Tools", fn: () => null, options:{ style:{ display: "none" } } },
    { name: "Sort Asc", fn: () => sortSolutionsAscending() },
    { name: "Sort Desc", fn: () => sortSolutionsDescending() },
    { name: "Reverse", fn: () => reverseSolutions() },
    { name: "Clear All", fn: () => clearAllSolutions() },
    { name: "Open Elements", fn: () => importData(loadElements) },
    //{ name: "document.write", fn: () => document.write() },
  ]
  const actionMenu = Create( "select", { assign:{ id: "action-menu" }, attr:{ tabIndex: -1 }, classes:["actionmenu"], style:{ width: "60px" } } )
  actionMenu.addEventListener( "change", ev => {
    actionItems[ev.target.selectedIndex].fn()
    ev.target.selectedIndex = 0
    ev.target.blur()
  } )
  Append(
    actionMenu,
    ...actionItems.map( (action, i) => Create( "option", Assign( { assign:{ innerText:action.name, value: i } }, action.options ?? {} ) ) )
  )
  Append( titleRow, actionMenu )
  
  // Load elements button
  const loadBtn = Create( "button", { assign:{ innerText: "Load element list" }, attr:{ tabIndex: -1 } } )
  loadBtn.addEventListener( "click", () => importData(loadElements) )
  //Append( titleRow, loadBtn )

  // Random button
  const randomBtn = Create( "button", { assign:{ innerText: "10 Random" }, attr:{} } )
  randomBtn.addEventListener( "click", () => addRandomSolutions(10) )
  Append( titleRow, randomBtn )
  
  // Event button
  if (eventElements.length) {
    const eventBtn = Create( "button", { assign:{ innerText: eventName }, style:{ backgroundColor: eventBackgroundColor, color: eventFontColor, borderColor: eventBorderColor } } )
    eventBtn.addEventListener( "click", () => eventElements.slice().reverse().forEach( name => search(name, true) ) )
    Append( titleRow, eventBtn )
  }

  
}



// Events

document.querySelector("#search").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    search()
    document.querySelector("#search").value = ""
  }
})


document.querySelector("#search").addEventListener("keyup", function(event) {

  if (event.key === "<") {
    document.querySelector("#solutions").replaceChildren()
    document.querySelector("#search").value = ""
  }

})


window.addEventListener("contextmenu", function(event) {

  if ( event.target.matches(".solution") ) {
		event.target.remove()
    event.preventDefault()
    return false

	} else if ( event.target.matches(".element") ) {
    const name = event.target.innerText.toLowerCase()
    elementsByName.set( name, elementsByName.get(name) ?? [name] )
    updateElementStatus()
    event.preventDefault()
    return false
  }

} )



// Utilities

function importData(fn, multiple=true) {
  const input = Create( "input", { attr:{ type: "file", multiple } } )

  input.onchange = async function() {
    const files = Array.from(input.files)
    await fn(files)
    console.log("Done processing", files.length, "files.")
  }

  input.click()
}


function _create_element(config, index, ...children) {
  const { attr, data, style, assign, classes } = config
  const getValue = (k, i, a) =>
    ( a[k] instanceof Array ? ( i > a[k].length - 1 ? a[k][a[k].length - 1] : a[k][i] ) : a[k] )

  const tag = getValue("tag", index, config.tag)
  const elem = document.createElement(tag)

  for (const k in attr)
    elem.setAttribute(k, getValue(k, index, attr))
  for (const k in data)
    elem.dataset[k] = getValue(k, index, data)
  for (const k in style)
    elem.style[k] = getValue(k, index, style)
  for (const k in assign)
    Assign(elem, { [k]: getValue(k, index, assign) })
  for (const className of classes ?? [])
    elem.classList.add( className )

  Append(elem, ...children.flat())
  return elem
}


function Create(tag, config, ...children) {
  const configs = config instanceof Object ? config : {}
  const { attr, data, style, assign } = configs
  const { max } = Math

  const objects = Assign(configs, {tag:{tag:tag}})
  let createCount = 1

  checkArrays:
  for (const objKey in objects) {
    const obj = objects[objKey]
    for (const item in obj) {
      const value = obj[item]
      if (value instanceof Array) {
        if (value.length)
          createCount = max(createCount, value.length)
        else {
          createCount = 0
          break checkArrays
        }
      }
    }
  }

  const nodes = []
  for (let i = 0; i < createCount; i++ ) {
    const elem = _create_element( objects, i, ...children.flat().map( ch => ch.cloneNode(true) ) )
    nodes.push(elem)
  }

  return createCount === 1 ? nodes[0] : nodes
}


// Helpers

function Get(selector, node) {
  return (node ? node : document).querySelector(selector)
}

function GetAll(selector, node) {
  return (node ? node : document).querySelectorAll(selector)
}

function Assign(...args) {
  return Object.assign(...args)
}

function Append(node, ...children) {
  node.append( ...children.flat() )
  return node
}

function Prepend(node, ...children) {
  node.prepend( ...children.flat() )
  return node
}

function Replace(node, ...children) {
  return node.replaceChildren(...children.flat()), node
}


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


function selectRandomRecipeIndices(amount) {
  const { floor, random } = Math
	const pickedIndices = []
	
  for ( let i = 0; i < amount; i++ ) {
		const randomIndex = floor( random() * data.create.length )
		pickedIndices.push(randomIndex)
	}
	
	return pickedIndices
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



// Download Stuff

function downloadElements(fileName, elementNames, maxPageSize=116, maxPages=20, randomOrder=false) {
  const { keys, assign } = Object
  const { floor, random } = Math

  let page = 1
  elementNames = elementNames.slice()

  while ( elementNames.length && page <= maxPages ) {
    const pickedElements = []
    for ( let i = 0; i < maxPageSize && elementNames.length; i++ ) {
      const randomIndex = randomOrder ? floor( random() * elementNames.length ) : 0
      pickedElements.push( elementNames[randomIndex] )
      elementNames.splice(randomIndex, 1)
    }

    const text = JSON.stringify(pickedElements)

    const fileNameStart = fileName.split(".")?.[0] ?? "elements"
    const fileNameEnd = fileName.split(".")?.[1] ?? ""
    download( fileNameStart + "_" + page + (fileNameEnd ? "." + fileNameEnd : ""), text )

    page++
  }
}


function downloadVariousElementCacheFiles () {
  const { entries, keys } = Object

  const doubleSelfMerge = []
  const tripleSelfMerge = []
  const quadrupleSelfMerge = []
  const twoUniqueMerge = []

  const doubleUsed = Object.create(null)
  const tripleUsed = Object.create(null)
  const quadUsed = Object.create(null)
  let twoUniqueUsed = Object.create(null)

  for ( const [resultId, recipes] of entries(data.create) ) {
    const recipe = recipes?.[0]
    const resultName = data.names[resultId].toLowerCase()
    const ownsResult = !!elementsByName.get(resultName)
    if (!recipe || ownsResult)
      continue

    if ( recipe.length === 2 ) {
      const id1 = recipe[0]
      const id2 = recipe[1]
      const name1 = data.names[id1].toLowerCase()
      const name2 = data.names[id2].toLowerCase()
      const allAvailableUnique = !(twoUniqueUsed[name1] ?? twoUniqueUsed[name2])
      const allAvailableDouble = !(doubleUsed[name1] ?? doubleUsed[name2])
      const allOwned = !!(elementsByName.get(name1) && elementsByName.get(name2))
      const allDifferent = id1 !== id2
      const allSame = id1 === id2

      if ( allOwned && allAvailableUnique && allDifferent ) {
        twoUniqueUsed[name1] = true
        twoUniqueUsed[name2] = true
        twoUniqueMerge.push(name1, name2)

        if ( twoUniqueMerge % 116 === 0 ) {
          twoUniqueUsed = Object.create(null)
        }
      }
      else if ( allOwned && allAvailableDouble && allSame ) {
        doubleUsed[name1] = true
        doubleSelfMerge.push(name1)
      }
    }
    else if ( recipe.length === 3 ) {
      const id1 = recipe[0]
      const id2 = recipe[1]
      const id3 = recipe[2]
      const name1 = data.names[id1].toLowerCase()
      const name2 = data.names[id2].toLowerCase()
      const name3 = data.names[id3].toLowerCase()
      const allAvailable = !(tripleUsed[name1] ?? tripleUsed[name2] ?? tripleUsed[name3])
      const allOwned = !!(elementsByName.get(name1) && elementsByName.get(name2) && elementsByName.get(name3))
      const allDifferent = id1 !== id2 && id1 !== id3 && id2 !== id3
      const allSame = id1 === id2 && id2 === id3


      if ( allOwned && allAvailable && allSame ) {
        tripleUsed[name1] = true
        tripleSelfMerge.push(name1)
      }
    }
    else if ( recipe.length === 4 ) {
      const id1 = recipe[0]
      const id2 = recipe[1]
      const id3 = recipe[2]
      const id4 = recipe[3]
      const name1 = data.names[id1].toLowerCase()
      const name2 = data.names[id2].toLowerCase()
      const name3 = data.names[id3].toLowerCase()
      const name4 = data.names[id4].toLowerCase()
      const allAvailable = !(quadUsed[name1] ?? quadUsed[name2] ?? quadUsed[name3] ?? quadUsed[name4])
      const allOwned = !!(elementsByName.get(name1) && elementsByName.get(name2) && elementsByName.get(name3) && elementsByName.get(name4))
      const allDifferent = id1 !== id2 && id1 !== id3 && id1 !== id4 && id2 !== id3 && id2 !== id4 && id3 !== id4
      const allSame = id1 === id2 && id2 === id3 && id3 === id4

      if ( allOwned && allAvailable && allSame ) {
        quadUsed[name1] = true
        quadrupleSelfMerge.push(name1)
      }
    }
  }

  if (tripleSelfMerge.length || 1) {
    console.log(tripleSelfMerge)
    console.log(quadrupleSelfMerge)
    console.log(twoUniqueMerge)
    
    downloadElements( "double.txt", doubleSelfMerge, 80, 10, true )
    downloadElements( "triple.txt", tripleSelfMerge, 80, 10, true )
    downloadElements( "quad.txt", quadrupleSelfMerge, 80, 10, true )
    downloadElements( "twoUnique.txt", twoUniqueMerge, 116, 30, false )
  }
}


function downloadReconstructedMerges() {
  const reconstructedMerges = []

  for ( let i = 0; i < data.create.length; i++ ) {
    const recipes = data.create[i]
    if (!recipes)
      continue
    for ( let j = 0; j < recipes.length; j++ ) {
      const result = data.names[i]
      const recipe = recipes[j]
      const ingredients = recipe.map( ingredient => data.names[ingredient].toLowerCase() )
      const obj = { Status: 9, Elements: ingredients, Result: result.toLowerCase(), Text: result.toLowerCase() }
      reconstructedMerges.push( obj )
    }
  }

  download( "ReconstructedMerges.json", JSON.stringify(reconstructedMerges) )
}



// Element File

async function loadElements(files) {
  // The file is binary.
  // Anatomy (repeats for each element):
  // [1] 4 bytes - The n length of the word.
  // [2] n bytes - UTF-8 string with a n length from the preceding int4.
  // [3] 8x1 bytes - Category (1, 2, 3, 4), Energy/Exp, Rarity/Boosted, FE, Origin
  
  const elements = []

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

  //Object.assign( elementsByName, Object.groupBy( elements, el => el[0] ) )
  elements.forEach( element => elementsByName.set( element[0], element ) )
  updateElementStatus()
}



// New Code

function addRandomSolutions( amount=10 ) {
  const candidates = data.create.filter( x => x?.[0] ).map( (_, i) => i )
  const randomElementIds = selectRandomArrayItems(candidates, amount)

  document.querySelector("#solutions").replaceChildren()
  randomElementIds.forEach( id => addSolutions(id) )
}


function addEventSolutions() {
  const candidates = data.create.filter( x => x?.[0] ).map( (_, i) => i )
  const randomElementIds = selectRandomArrayItems(candidates, amount)

  //document.querySelector("#solutions").replaceChildren()
  randomElementIds.forEach( id => addSolutions(id) )
}


function addCombination(combination, solution) {
  //console.log(combination, solution)
  const packed = []
  let lastId = combination[0]
  let count = 1

  for (let i = 1; i < combination.length; i++) {
    if (combination[i] === lastId) {
      count++
    } else {
      packed.push({ id: lastId, count })
      lastId = combination[i]
      count = 1
    }
  }
  packed.push({ id: lastId, count })
  packed.forEach( (item, i) => {
    if (i > 0) {
      solution.appendChild(document.createTextNode(' + '))
    }

    const element = createElementSpan(item.id)
    const className = elementsByName.size ? ( elementsByName.get( getName(item.id).toLowerCase() ) ? "have" : "missing" ) : null
    if ( className ) {
      element.classList.add(className)
    }
    element.classList.add("ingredient")
    solution.appendChild(element)

    if (item.count > 1) {
      solution.appendChild(document.createTextNode(" ×" + item.count))
    }
  } )
}


function addSolutions(resultId, afterNode) {
  const id = typeof resultId === "number" ? formatBack(getName(resultId)) : resultId

  const existingSolution = document.querySelector(`[data-id="${id}"]`)
  if (existingSolution) {
    existingSolution.remove()
    
    if ( afterNode ) {
      afterNode.after(existingSolution)
    } else {
      Get("#solutions").prepend(existingSolution)
    }
    
    flashDiv(existingSolution)
    return
  }

  const solution = document.createElement('div')
  solution.classList.add('solution')
  solution.dataset.id = id

  const creates = window.data.create[resultId]
  //if (!creates?.length)
  //  return

  const close = document.createElement('span')
  close.classList.add('close')
  close.addEventListener('click', function () {
    solution.remove()
  })
  solution.appendChild(close)

  const recipeResult = createElementSpan(resultId, false)
  const elementListLoaded = !!elementsByName.size
  const className = elementListLoaded ? ( elementsByName.get( getName(resultId)?.toLowerCase() ) ? "have" : "missing" ) : null
  if ( className )
    recipeResult.classList.add(className)
  recipeResult.classList.add("result")
  solution.appendChild( recipeResult )
	if (creates?.length)
  	solution.appendChild( document.createTextNode(' = ') )

  for (let i = 0; i < creates?.length; i++) {
    if (i > 0) {
      solution.appendChild( document.createTextNode(' or ') )
    }
    addCombination(creates[i], solution)
  }

  solution.appendChild(document.createElement('br'))

  if ( afterNode )
    afterNode.after(solution)
  else
    document.querySelector("#solutions").prepend(solution)
}


function search(name, allowNonExisting=false) {
    const elementName = name ?? document.getElementById("search").value.trim()
    let id = getId(elementName)
    if (!~id) {
        id = getId(formatElement(formatBack(elementName)))
    }
    if (~id) {
        addSolutions(id)
    } else if (elementName && allowNonExisting) {
        addSolutions(elementName)
    }
}


function createElementSpan(id, clickable=true) {
    const name = typeof id === "number" ? getName(id) : id
    const element = document.createElement("span")
    element.classList.add("element")
    element.textContent = formatElement(name)
    if ( typeof id === "string" )
      element.classList.add("norecipe")
    if (clickable) {
      element.addEventListener("click", function () {
        addSolutions(id, element.parentElement)
      })
    }
    return element
}


function updateElementStatus() {
  const nodes = document.querySelectorAll(".element")

  for ( const node of Array.from(nodes) ) {
    const name = node.innerText.toLowerCase()
    if ( elementsByName.get(name) ) {
      node.classList.remove("missing")
      node.classList.add("have")
    }
    else {
      node.classList.remove("have")
      node.classList.add("missing")
    }
  }
}



// Search

function fuzzySearch(query, words, limit = 50) {
    if (!query) return []

    query = query.toLowerCase()

    return words
        .map(word => {
            const lowerWord = word.toLowerCase()
            let score = 0, index = 0, firstMatch = -1

            for (let c of query) {
                let foundAt = lowerWord.indexOf(c, index)
                if (~foundAt) {
                    if (!~firstMatch)
                      firstMatch = foundAt
                    score += 2
                    index = foundAt + 1
                } else {
                    score -= 1
                }
            }

            const prefixBonus = lowerWord.startsWith(query) ? 10 : 0
            const positionPenalty = firstMatch
            const lengthPenalty = lowerWord.length * 0.1

            score += prefixBonus - positionPenalty - lengthPenalty

            return { word, score }
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(result => result.word)
}


function containsSearch(query, words, limit=50) {
    if (!query) return []
    query = query.toLowerCase()
    return words.filter( word => word.toLowerCase().includes(query) ).slice(0, limit)
}


function startsWithSearch(query, words, limit=50) {
    if (!query) return []
    query = query.toLowerCase()
    return words.filter( word => word.toLowerCase().startsWith(query) ).slice(0, limit)
}


function endsWithSearch(query, words, limit=50) {
    if (!query) return []
    query = query.toLowerCase()
    return words.filter( word => word.toLowerCase().endsWith(query) ).slice(0, limit)
}


function regExpSearch(query, words, limit=50) {
    query = query.toLowerCase()
    
    try {
      if (!query)
        return []
      const re = new RegExp(query)
      return words.filter( word => word.toLowerCase().match(query) ).slice(0, limit)
      
    } catch (e) {
      return []
    }
}


function mkAutocomplete(input, allowNew=false) {
    const container = document.createElement("div")
    container.classList.add("autocomplete-container")
    document.body.appendChild(container)

    const suggestionBox = document.createElement("ul")
    suggestionBox.classList.add("autocomplete-suggestions")
    container.appendChild(suggestionBox)

    let lastResults = []
    let activeIndex = 0 // Erstes Element immer aktiv

    function updatePosition() {
        const rect = input.getBoundingClientRect()
        container.style.top = `${rect.bottom + window.scrollY}px`
        container.style.left = `${rect.left + window.scrollX}px`
        container.style.width = `${rect.width}px`
    }

    function clearSuggestions() {
        suggestionBox.replaceChildren()
        container.style.display = "none"
        activeIndex = 0
    }

    document.getElementById("search-method").addEventListener("change", function () {
        searchMethod = searchMethods[this.selectedIndex]
        input.dispatchEvent(new Event("input"))
    })

    input.addEventListener("input", function () {
        const query = this.value
        if (!query) {
            clearSuggestions()
            lastResults = []
            return
        }

        let results = searchMethod(query, window.data.namesSorted, 100)

        if (JSON.stringify(results) === JSON.stringify(lastResults)) {
            // Vorschläge haben sich nicht geändert → Verhindert Flackern
            return
        }
        lastResults = results

        if (results.length === 0) {
            clearSuggestions()
            return
        }

        // **Direkt `.active` beim Erstellen setzen → Kein Flackern mehr**
        suggestionBox.innerHTML = results
            .map((word, index) => `<li data-index="${index}"${index === 0 ? " class=\"active\"" : ""}>${word}</li>`)
            .join("")

        suggestionBox.scrollTop = 0
        container.style.display = "block"
        updatePosition()
    })

    input.addEventListener("focus", function () {
        this.select()
    })

    input.addEventListener("keydown", function (event) {
        let items = suggestionBox.querySelectorAll("li")

        if (event.key === "ArrowDown") {
            event.preventDefault()
            activeIndex = (activeIndex + 1) % items.length
        } else if (event.key === "ArrowUp") {
            event.preventDefault()
            activeIndex = (activeIndex - 1 + items.length) % items.length
        } else if (event.key === "Enter") {
            if (items[activeIndex]) {
                input.value = items[activeIndex].textContent
                clearSuggestions()
                event.preventDefault()
            }
        } else if (event.key === "Tab") {
            if (allowNew) {
                return
            }
            if (items[activeIndex]) {
                input.value = items[activeIndex].textContent
                clearSuggestions()
                const nextInput = input.nextElementSibling
                if (nextInput) {
                    nextInput.focus()
                }
                event.preventDefault()
            }
        } else if (event.key === "Escape") {
            clearSuggestions()
        }

        // **Aktive Klasse nur dann aktualisieren, wenn sich die Auswahl ändert**
        items.forEach((item, idx) => {
            if (idx === activeIndex) {
                item.classList.add("active")
            } else {
                item.classList.remove("active")
            }
        })
    })

    input.addEventListener("blur", function () {
        //setTimeout(clearSuggestions, 150)
    })

    suggestionBox.addEventListener("mousedown", function (event) {
        if ( event.target.matches("li") ) {
            //input.value = event.target.textContent
            search( event.target.textContent )
            if ( event.buttons & 0b1 ) {
                clearSuggestions()
                input.value = ""
            }
            if ( event.buttons & 0b10 ) {
                //event.preventDefault()
            }
        }
    })
    
    suggestionBox.addEventListener("contextmenu", function (event) {
        event.preventDefault()
        return false
    })

    document.addEventListener("click", function (event) {
        if (!container.contains(event.target) && event.target !== input) {
            clearSuggestions()
        }
    })

    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition)
}


function getName(id) {
    return window.data.names[id]
}


function getId(name) {
    return window.data.names.indexOf(name)
}


function formatBack(name) {
    return name.toLowerCase().replace(/ /g, "_")
}


function formatElement(name) {
    name = name.replace(/_/g, " ")
    return name.toLowerCase().replace(/(^|[0-9\- ])([a-z])/g, (match, p1, p2) => {
        return p1 + p2.toUpperCase()
    })
}


function flashDiv(div) {
    div.classList.add("flash")
    setTimeout(() => {
        div.classList.remove("flash")
    }, 500)
}


document.addEventListener("DOMContentLoaded", function () {
    const startElements = ["fire", "water", "air", "earth"]
    
    // Update element count
    document.getElementById("element-count").textContent = window.data.names.length
    
    // Set recipes for basic elements to empty array
    startElements.forEach(name => {
        const id = getId(name)
        window.data.create[id] = []
    })
    
    // Enable results display
    const input = document.querySelector("#search")
    mkAutocomplete(input)
    
    // Enable the search button
    const searchBtn = document.querySelector("#searchbtn")
    searchBtn.addEventListener( "click", () => search() )
    
    // Set search method
    searchMethod = searchMethods[ document.querySelector("#search-method").selectedIndex ]
    
    // Make sorted element list for binary search
    window.data.namesSorted = [...window.data.names].sort()

})









