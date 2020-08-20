"use strict";

const MODE = [
  "Specialized",
  "Megamorphic",
  "Generic"
];

const HAPPINESS = [
  "😀",
  "😐",
  "☹️",
  "🤬"
];

const JSOP_HEADER_ROWS = 1;
const STUB_HEADER_ROWS = 2;

var selectedJSOpRowNumber;
var selectedStubRowNumber;

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

// TODO: Refine happiness calculations to take in account 
// all factors of CacheIR.
function calculateHappinessLevel(stub) {
  if (stub.stubHealth > 20) {
    return 3;
  } else if (stub.stubHealth < 20 && stub.stubHealth > 15) {
    return 2;
  } else if (stub.stubHealth < 15 && stub.stubHealth > 10) {
    return 1;
  } else {
    return 0;
  }
}

function addHealthScore(row, stubs) {
  let health = 0;
  for (let stub of stubs) {
    let comparison = calculateHappinessLevel(stub);
    if (comparison > health) {
      health = comparison;
    }
  }

  addCellValue(row, HAPPINESS[health]);
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
function createStubChainInspectorTable(cacheIRTable, cacheIRTbody, stubTbody, entry) {
  if (entry.stubs.length) {
    for (let stub of entry.stubs) {
      let row = document.createElement("tr");

      addCellValue(row, stub.stubHealth);
      addCellValue(row, stub.hitCount);

      row.onclick = function() {
        // Highlight selected stub row.
        highlightSelectedStub(stubTbody, row);

        if (cacheIRTable.style.display === "") {
          cacheIRTable.style.display = "block";
        } else {
          cacheIRTbody.innerHTML = "";
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
function createOpTableRow(entry, opTbody, stubTable) {
  let row = document.createElement("tr");
  let stubTbody = stubTable.getElementsByTagName('tbody')[0];

  let cacheIRTable = document.getElementById("cacheIR-table");
  let cacheIRTbody = cacheIRTable.getElementsByTagName('tbody')[0];

  // Add JS_OP to table.
  addCellValue(row, entry.op);

  // Add line number to table.
  addCellValue(row, entry.lineno);

  // Add column number to table.
  addCellValue(row, entry.column);

  // Add health score to table if stubs exist.
  if (entry.hasOwnProperty('stubs')) {
    addHealthScore(row, entry.stubs);

    // If stubs exist then add stub table for that row.
    row.onclick = function() {
      // Highlight selected JS_OP row.
      highlightSelectedJSOp(opTbody, row);

      if (stubTable.style.display === "") {
        stubTable.style.display = "block";
      } else {
        //  Reset selected row number for stub table.
        selectedStubRowNumber = undefined;
        stubTbody.innerHTML = "";

        // Clear out CacheIR table for new stub table.
        cacheIRTable.style.display = "";
        cacheIRTbody.innerHTML = "";
      }

      let jsOp = document.getElementById("jsOp-id");
      jsOp.textContent = entry.op;

      createStubChainInspectorTable(cacheIRTable, cacheIRTbody, stubTbody, entry);
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

function cacheIREntries(script) {
  let stubTable = document.getElementById("stub-table");
  let opTable = document.getElementById("op-table");
  opTable.style.display = "block";

  let entries = script.entries;
  let opTbody = opTable.getElementsByTagName('tbody')[0];
  for (let entry of entries) {
    createOpTableRow(entry, opTbody, stubTable);
  }
}

function rateMyCacheIR(json) {
  let script = json[0];
  if (script.channel != "RateMyCacheIR") {
    document.getElementById("status").textContent = "Wrong JSON spew channel."
  }

  document.getElementById("script-name").textContent = script.location.filename;
  document.getElementById("script-name").style.display = "inline";

  cacheIREntries(script);
}

function handleJSON(event) {
  const reader = new FileReader();
  const file = document.getElementById("file").files[0];
  let json;

  reader.onload = function(event) {
    const status = document.getElementById("status");

    try {
      json = JSON.parse(event.target.result);
      status.textContent = "Successfully parsed JSON.";
    } catch (e) {
      status.textContent = "Error parsing JSON file.";
      status.style.color = "red";
    }

    rateMyCacheIR(json);
  };

  reader.readAsText(file);
  event.preventDefault();
}

document.getElementById("form").addEventListener("submit", function() {
  handleJSON(event);
});

function clear() {
  document.getElementById("form").reset();
  let opTable = document.getElementById("op-table");
  let stubTable = document.getElementById("stub-table");
  let cacheIROpTable = document.getElementById("cacheIR-table");

  opTable.getElementsByTagName('tbody')[0].innerHTML = "";
  opTable.style.display = "";

  stubTable.getElementsByTagName('tbody')[0].innerHTML = "";
  stubTable.style.display = "";

  cacheIROpTable.getElementsByTagName('tbody')[0].innerHTML = "";
  cacheIROpTable.style.display = "";

  selectedJSOpRowNumber = undefined;
  selectedStubRowNumber = undefined;

  document.getElementById("script-name").textContent = "";
  document.getElementById("status").textContent = "Cleared.";
}

document.getElementById("clear").addEventListener("click", function() {
  clear();
});
