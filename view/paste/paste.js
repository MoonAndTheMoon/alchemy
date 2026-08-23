
// Globals

var esElementSet = new Set()
data.names.forEach( name => esElementSet.add(name) )



// Add UI

{
  const titleRow = Create( "div", { assign:{ id: "titleRow" } } )
  document.querySelector("body").prepend( titleRow )
  
  const h1 = Create( "h1", { assign:{ innerText: "Merge Paste" } } )
  Append( titleRow, h1 )
  
  const infoText = Create( "p", { assign:{ innerText: "Currently this will just attach a timestamp to the paste and then download it. It will take a few days to make something better." } } )
  Append( document.body, infoText )
  
  // Load elements button
  const loadButton = Create( "button", { assign:{ innerText: "Load files" }, attr:{ tabIndex: -1 } } )
  loadButton.addEventListener( "click", () => importData(readPaste) )
  //Append( document.body, loadButton )
  
  // Paste elements button
  const pasteAndDownloadButton = Create( "button", { assign:{ innerText: "Paste & Download" }, attr:{ tabIndex: -1 } } )
  pasteAndDownloadButton.addEventListener( "click", async () => {
    try {
      const text = await navigator.clipboard.readText()
      //readPaste(text)
      const modifiedText = "#" + Date.now() + "\r\n" + text
      download( "paste_" + Date.now() + ".txt", modifiedText )
      Get("#pasteContent").innerText = modifiedText
    } catch(err) {
      alert(err)
      console.log(err)
    }
  } )
  Append( document.body, pasteAndDownloadButton )
  
  // Paste elements input
  const pasteAndDownloadInput = Create( "input", { assign:{ innerText: "", type: "text" }, attr:{ tabIndex: -1 }, style:{ display: "span" } } )
  pasteAndDownloadInput.addEventListener( "paste", event => {
    try {
      const text = event.clipboardData.getData("text")
      //readPaste(text)
      const modifiedText = "#" + Date.now() + "\r\n" + text
      download( "paste_" + Date.now() + ".txt", modifiedText )
      Get("#pasteContent").innerText = modifiedText
    } catch(err) {
      alert(err)
      console.log(err)
    }
  } )
  Append( document.body, pasteAndDownloadInput )
  
  // PasteContent
  const pasteText = Create( "p", { assign:{ innerText: "", id: "pasteContent" } } )
  Append( document.body, pasteText )
  
  /*

  
  // Acton Menu
  const actionItems = [
    { name: "Tools", fn: () => null, options:{ style:{ display: "none" } } },
    { name: "Sort Asc", fn: () => sortSolutionsAscending() },
    { name: "Sort Desc", fn: () => sortSolutionsDescending() },
    { name: "Reverse", fn: () => reverseSolutions() },
    { name: "Remove Found", fn: () => removeFoundResults() },
    { name: "Remove Existing", fn: () => removeExistingResults() },
    { name: "Remove Non-Existing", fn: () => removeNonExistingResults() },
    { name: "Clear All", fn: () => clearAllSolutions() },
    { name: "Toggle Add All", fn: () => toggleAddAll() },
    { name: "Load all recipes", fn: () => loadAllRecipes() },
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
  */
}



// Events

window.addEventListener( "paste", event => {
	//const paste = event.clipboardData.getData("text")
  //readPaste()
  console.log("Paste event ignored.")
} )

/*document.querySelector("#search").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    search()
    document.querySelector("#search").value = ""
  }
})*/



// Code

function readPaste(paste) {
  console.log(paste)
}



// Utilities

const compareMixedNumericFn = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'}).compare


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

