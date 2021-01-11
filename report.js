"use strict";

const MODE = [
  "Specialized",
  "Megamorphic",
  "Generic"
];

const CONTEXT = [
  "Shell",
  "Transition",
  "Trial Inlining",
];

const HAPPINESS = [
  "🤬",
  "☹️",
  "😐",
  "😀"
];

const SCRIPT_HEADER_ROWS = 1;
const JSOP_HEADER_ROWS = 1;
const STUB_HEADER_ROWS = 2;

const SCRIPT_NAME_COLUMN = 0;
const SCRIPT_LINE_COLUMN = 1;
const SCRIPT_COLUMN_COLUMN = 2;
const SCRIPT_HIT_COUNT_COLUMN = 3;
const SCRIPT_HEALTH_COLUMN = 4;

var PARSED_JSON;
var happinessFilter = undefined;

var selectedScriptRowNumber;
var selectedJSOpRowNumber;
var selectedStubRowNumber;

function highlightSelectedScript(tbody, row) {
  if (typeof selectedScriptRowNumber !== 'undefined') {
    // Change previously selected row to original color.
    tbody.rows[selectedScriptRowNumber].style.backgroundColor = "";
  }

  row.style.backgroundColor = "#03635d";
  selectedScriptRowNumber = row.rowIndex - SCRIPT_HEADER_ROWS;
}

function highlightSelectedStub(tbody, row) {
  if (typeof selectedStubRowNumber !== 'undefined') {
    // Change previously selected row to original color.
    tbody.rows[selectedStubRowNumber].style.backgroundColor = "";
  }

  row.style.backgroundColor = "#03635d";
  selectedStubRowNumber = row.rowIndex - STUB_HEADER_ROWS;
}

function highlightSelectedJSOp(tbody, row) {
  if (typeof selectedJSOpRowNumber !== 'undefined') {
    // Change previously selected row to original color.
    tbody.rows[selectedJSOpRowNumber].style.backgroundColor = "";
  }

  row.style.backgroundColor = "#03635d";
  selectedJSOpRowNumber = row.rowIndex - JSOP_HEADER_ROWS;
}

function addCellValue(row, value) {
  let cell = row.insertCell();
  let text = document.createTextNode(value);
  cell.appendChild(text);
}

// Create table for displaying CacheIROps contained in selected stub.
function createCacheIRTable(cacheIRTbody, stub) {
  if (stub.cacheIROps.length) {
    for (let op of stub.cacheIROps) {
      let row = document.createElement("tr");
      addCellValue(row, op.cacheIROp);
      addCellValue(row, op.opHealth);
      cacheIRTbody.appendChild(row);
    }
  } else {
    let row = document.createElement("tr");
    addCellValue(row, "No CacheIROps recorded.");
    cacheIRTbody.appendChild(row);
  }
}

// Create table for displaying stub chain for the selected JS_OP.
function createStubTable(cacheIRTable, cacheIRTbody, stubTbody, entry) {
  if (entry.stubs.length) {
    for (let stub of entry.stubs) {
      let row = document.createElement("tr");

      addCellValue(row, stub.stubHealth);
      addCellValue(row, stub.hitCount);

      row.onclick = function() {
        // Highlight selected stub row.
        highlightSelectedStub(stubTbody, row);

        if (cacheIRTable.style.display === "") {
          cacheIRTable.style.display = "inline-block";
        } else {
          clearCacheIRTable("inline-block");
        }

        createCacheIRTable(cacheIRTbody, stub);
      };

      stubTbody.appendChild(row);
    }
  } else {
    let row = document.createElement("tr");
    addCellValue(row, "No Stubs Attached.");
    stubTbody.appendChild(row);
  }

}

// Create table for displaying JS_OPs and their associated information.
function createOpTableRow(entry, opTbody) {
  let health = entry.entryHappiness;

  if (happinessFilter == undefined || happinessFilter == health) {
    let stubTable = document.getElementById("stub-table");
    let stubTbody = stubTable.getElementsByTagName('tbody')[0];
    let row = document.createElement("tr");

    // Add JS_OP to table.
    addCellValue(row, entry.op);

    // Add line number to table.
    addCellValue(row, entry.lineno);

    // Add column number to table.
    addCellValue(row, entry.column);

    // Add health score to table if stubs exist.
    if (entry.hasOwnProperty('stubs')) {
      let cacheIRTable = document.getElementById("cacheIR-table");
      let cacheIRTbody = cacheIRTable.getElementsByTagName('tbody')[0];

      addCellValue(row, HAPPINESS[health]);

      // If stubs exist then add stub table for that row.
      row.onclick = function() {
        // Highlight selected JS_OP row.
        highlightSelectedJSOp(opTbody, row);

        if (stubTable.style.display === "") {
          stubTable.style.display = "inline-block";
        } else {
          // When selecting a new JS_Op we must clear all previously 
          // created tables.
          clearStubTable("inline-block");
          clearCacheIRTable("");
        }

        // For the display of the selected JS_Op.
        let jsOp = document.getElementById("jsOp-id");
        jsOp.textContent = entry.op;

        createStubTable(cacheIRTable, cacheIRTbody, stubTbody, entry);
      };
    }

    // Add mode to table if mode was recorded.
    if (entry.hasOwnProperty('mode')) {
      addCellValue(row, MODE[entry.mode]);
    }

    // Add fallback count to table if it exists.
    if (entry.hasOwnProperty('fallbackCount')) {
      addCellValue(row, entry.fallbackCount);
    }

    opTbody.appendChild(row);
  }
}

function createOpTable(context, script, opTable, opTbody) {
  opTable.style.display = "inline-block";

  if (context == "Shell") {
    for (let entry of script.entries) {
      createOpTableRow(entry, opTbody);
    }
  } else {
    createOpTableRow(script, opTbody);
  }

  if (happinessFilter && opTbody.innerHTML == "") {
    let row = document.createElement("tr");
    addCellValue(row, "No stubs have happiness level specified by filter.");
    opTbody.appendChild(row);
  }
}

// Create table for displaying scripts and their associated information.
function createScriptTableRow(script, scriptTbody) {
  let context = CONTEXT[script.spewContext];
  let health = undefined;
  if (context == "Shell") {
    health = script.scriptHappiness;
  } else {
    // If spew context is not shell, then we only spew the CacheIR for 
    // unhappy ICs.
    health = 0;
  }

  if (happinessFilter == health || happinessFilter == undefined) {
    let row = document.createElement("tr");

    // Add script name to table.
    addCellValue(row, script.location.filename);

    // Add line number to table.
    addCellValue(row, script.location.line);

    // Add column number to table.
    addCellValue(row, script.location.column);

    // Add final hit count to table.
    addCellValue(row, undefined);

    // Add context to table.
    addCellValue(row, context);

    // Add script health only when we have spewed the whole script from 
    // the shell.
    addCellValue(row, HAPPINESS[health]);

    row.onclick = function() {
      let opTable = document.getElementById("op-table");
      let opTbody = opTable.getElementsByTagName('tbody')[0];

      // Highlight selected script row.
      highlightSelectedScript(scriptTbody, row);

      if (opTable.style.display === "") {
        opTable.style.display = "inline-block";
      } else {
        // When selecting a new script we must clear all previously 
        // created tables.
        clearOpTable("inline-block");
        clearStubTable("");
        clearCacheIRTable("");
      }

      createOpTable(context, script, opTable, opTbody);
    };


    scriptTbody.appendChild(row);
  }
}

// Add final warm up count to script table.
function insertFinalWarmUpCountIntoTable(script, scriptTbody) {
  for (let row = 0; row < scriptTbody.rows.length; row++) {
    let filename = scriptTbody.rows[row].cells[SCRIPT_NAME_COLUMN].innerHTML;
    let lineno = scriptTbody.rows[row].cells[SCRIPT_LINE_COLUMN].innerHTML;
    let column = scriptTbody.rows[row].cells[SCRIPT_COLUMN_COLUMN].innerHTML;

    if (filename == script.filename && lineno == script.line && 
        column == script.column) {
      scriptTbody.rows[row].cells[SCRIPT_HIT_COUNT_COLUMN].innerHTML = parseInt(script.finalWarmUpCount);
    }
  }
}

function createScriptTable() {
  let scriptTable = document.getElementById("script-table");
  let scriptTbody = scriptTable.getElementsByTagName('tbody')[0];
  scriptTable.style.display = "inline-block";

  for (let script of PARSED_JSON) {
    if (script.channel != "RateMyCacheIR") {
      document.getElementById("status").textContent = "Wrong JSON spew channel."
    }

    if (script.hasOwnProperty('finalWarmUpCount')) {
      insertFinalWarmUpCountIntoTable(script, scriptTbody);
    } else {
      createScriptTableRow(script, scriptTbody);
    }
  }

  if (happinessFilter && scriptTbody.innerHTML == "") {
    let row = document.createElement("tr");
    addCellValue(row, "No scripts have happiness level specified by filter.");
    scriptTbody.appendChild(row);
  }

  document.getElementById("happiness-filter").style.display = "inline-block";
}

function handleJSON(event) {
  const reader = new FileReader();
  const file = document.getElementById("file").files[0];

  reader.onload = function(event) {
    const status = document.getElementById("status");

    try {
      PARSED_JSON = JSON.parse(event.target.result);
      status.textContent = "Successfully parsed JSON.";
    } catch (e) {
      status.textContent = "Error parsing JSON file.";
      status.style.color = "red";
      return;
    }

    createScriptTable();
  };

  reader.readAsText(file);
  event.preventDefault();
}

document.getElementById("input-form").addEventListener("submit", function() {
  handleJSON(event);
});

function filterOpTableHappiness() {
  clearAllTables();
  createScriptTable();
}

document.getElementById("clear-filter").addEventListener("click", function() {
  if (happinessFilter != undefined) {
    happinessFilter = undefined;
    filterOpTableHappiness();
  }
});

document.getElementById("sad").addEventListener("click", function() {
  if (happinessFilter != 0) {
    happinessFilter = 0;
    filterOpTableHappiness();
  }
});

document.getElementById("medium-sad").addEventListener("click", function() {
  if (happinessFilter != 1) {
    happinessFilter = 1;
    filterOpTableHappiness();
  }
});

document.getElementById("medium-happy").addEventListener("click", function() {
  if (happinessFilter != 2) {
    happinessFilter = 2;
    filterOpTableHappiness();
  }
});

document.getElementById("happy").addEventListener("click", function() {
  if (happinessFilter != 3) {
    happinessFilter = 3;
    filterOpTableHappiness();
  }
});

function clearScriptTable(displayString) {
  let scriptTable = document.getElementById("script-table");
  scriptTable.getElementsByTagName('tbody')[0].innerHTML = "";
  scriptTable.style.display = displayString;
  selectedScriptRowNumber = undefined;
}

function clearOpTable(displayString) {
  let opTable = document.getElementById("op-table");
  opTable.getElementsByTagName('tbody')[0].innerHTML = "";
  opTable.style.display = displayString;
  selectedJSOpRowNumber = undefined;
}

function clearStubTable(displayString) {
  let stubTable = document.getElementById("stub-table");
  stubTable.getElementsByTagName('tbody')[0].innerHTML = "";
  stubTable.style.display = displayString;
  selectedStubRowNumber = undefined;
}

function clearCacheIRTable(displayString) {
  let cacheIROpTable = document.getElementById("cacheIR-table");
  cacheIROpTable.getElementsByTagName('tbody')[0].innerHTML = "";
  cacheIROpTable.style.display = displayString;
}

function clearAllTables() {
  clearScriptTable("");
  clearOpTable("");
  clearStubTable("");
  clearCacheIRTable("");
}

document.getElementById("clear").addEventListener("click", function() {
  document.getElementById("input-form").reset();
  document.getElementById("happiness-filter").style.display = "";
  document.getElementById("status").style.color = "#c9f0ff";

  clearAllTables();

  document.getElementById("status").textContent = "Cleared.";
});