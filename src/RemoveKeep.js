import './App.css';
import React, { useState, useEffect } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { WebsocketProvider } from 'y-websocket';
import { nanoid as uuidv4 } from 'nanoid';
import * as Y from 'yjs';

const yDoc = new Y.Doc();
const wsProvider = new WebsocketProvider('ws://localhost:1234', 'removeKeep', yDoc);
const yMap = yDoc.getMap('spreadsheet');
const yColumns = yDoc.getArray('columns');
const yRows = yDoc.getArray('rows');
const undoColumns = new Y.UndoManager(yColumns);
const undoRows = new Y.UndoManager(yRows);
const yColKeep = yDoc.getMap('column-keep');
const yRowKeep = yDoc.getMap('row-keep');

function RemoveKeep() {
  // Initialization of the JSX display -- if possible, read from the yDoc, otherwise generate the default
  const [spreadsheet, setSpreadsheet] = useState([
      [undefined,undefined,undefined],
      [undefined,undefined,undefined],
      [undefined,undefined,undefined]
    ]);

  const [headers, setHeaders] = useState([
    "XYZ","XYZ","XYZ"
  ]);

  function initialize() { 
    for (let i = 0; i < 3; i++) {
      const id = uuidv4(10);
      yColumns.push([id]);
      yMap.set(id,"XYZ");
      yRows.push([uuidv4(10)]);
    }
  }

  const [connectionStatus, setConnectionStatus] = useState('');

  useEffect(() => {
    // Track & update connection status to properly update document on connection change.
    wsProvider.on('status', event => {
      setConnectionStatus(event.status);
    });
    // Initialize yMap on first connect.
    wsProvider.once('sync', () => {
      if (yMap.size === 0) {
        initialize();
      } else {
        rebuildSpreadsheet();
  
      }
    });
    // yMap observer. Handles cell and label changes.
    yMap.observe(() => {
      rebuildSpreadsheet();
    });
    // yArray observers. Handle structural changes
    yColumns.observe(() => {
      rebuildSpreadsheet();
    });
    yRows.observe(() => { 
      rebuildSpreadsheet();
    });
    // Keep Map observers. Handle undo of deletion if keep flag was set.
    yColKeep.observe((event) => {
      if (event.transaction.origin) {
        yColKeep.forEach((_,key) => {
          if (yColumns.toArray().indexOf(key) < 0) {
            undoColumns.undo();
          }
        })
        yColKeep.clear();
      }
    });
    yRowKeep.observe((event) => {
      if (event.transaction.origin) {
        yRowKeep.forEach((_,key) => {
          if (yRows.toArray().indexOf(key) < 0) {
            undoRows.undo();
          }
        })
        yRowKeep.clear();
      }
    });
    // Undo manager listeners. Filter out insertions, since they do not need to be undone.
    undoColumns.on('stack-item-added', () => {
      undoColumns.undoStack.forEach((item,index) => {
        if (item.insertions.clients.size > 0)
          undoColumns.undoStack.splice(index,1);
      })
    });
    undoRows.on('stack-item-added', () => {
      undoRows.undoStack.forEach((item,index) => {
        if (item.insertions.clients.size > 0)
          undoRows.undoStack.splice(index,1);
      })
    });
  }, []);

  function rebuildSpreadsheet() {
    const newHeaders = [];
    yColumns.forEach(value => newHeaders.push(yMap.get(value)));
    setHeaders(newHeaders);
    const newSpreadsheet = Array(yRows.length);
    for (let i = 0; i < yRows.length; i++) {
      newSpreadsheet[i] = Array.apply(null, Array(yColumns.length)).map(function () {return undefined});
    }
    yMap.forEach((value,key) => {
      if (key.split(',').length === 2) {
        const rowIndex = yRows.toArray().indexOf(key.split(',')[0]);
        const colIndex = yColumns.toArray().indexOf(key.split(',')[1]);
        if (rowIndex >= 0 && colIndex >= 0) newSpreadsheet[rowIndex][colIndex] = value;
      }
    });
    setSpreadsheet(newSpreadsheet);
  }

  // Context menu context for the column and row context menus, respectively
  const columnContextMenuItems = [
    { text: "Insert left", image: "https://cdn-icons-png.flaticon.com/512/7601/7601881.png" },
    { text: "Delete column", image: "https://cdn-icons-png.flaticon.com/512/7794/7794583.png" },
    { text: "Insert right", image: "https://cdn-icons-png.flaticon.com/512/7601/7601880.png" }
  ];

  const rowContextMenuItems = [
    { text: "Insert above", image: "https://cdn-icons-png.flaticon.com/512/6535/6535072.png" },
    { text: "Delete row", image: "https://cdn-icons-png.flaticon.com/512/1/1813.png" },
    { text: "Insert below", image: "https://cdn-icons-png.flaticon.com/512/6535/6535075.png" }
  ];

  // Action handlers for spreadsheet manipulation
  // - Header rename handler
  const handleHeaderChange = (colIndex, value) => {
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    setHeaders(newHeaders);
  }

  const handleHeaderBlur = (colIndex, value) => {
    if (yMap.get(colIndex) !== value) {
      yMap.set(yColumns.get(colIndex), value);
    }
    yColKeep.set(yColumns.get(colIndex),yDoc.clientID);
  }

  // - Row & column insertion
  const handleInsertRow = (index) => {
    yRows.insert(index, [uuidv4(10)]);
  }

  const handleInsertCol = (index) => {
    const id = uuidv4(10);
    yMap.set(id, 'XYZ')
    yColumns.insert(index, [id]);
  }

  // - Row & column removal
  const handleRemoveRow = (index) => {
    const rowId = yRows.get(index);
    if (yRowKeep.has(rowId)) {
      yRowKeep.delete(rowId);
    }
    yRows.delete(index);
  }

  const handleRemoveCol = (index) => {
    const colId = yColumns.get(index);
    if (yColKeep.has(colId)) {
      yColKeep.delete(colId);
    }
    yColumns.delete(index);    
  }

  // - Cell change
  const handleCellChange = (rowIndex, cellIndex, value) => {
    const newSpreadsheet = [...spreadsheet];
    newSpreadsheet[rowIndex][cellIndex] = value;
    setSpreadsheet(newSpreadsheet);
  };

  const handleCellBlur = (rowIndex, cellIndex, value) => {
    if (value === '') {
      if (!(yMap.has(yRows.get(rowIndex) + ',' + yColumns.get(cellIndex)))) return;
    }
    yMap.set(yRows.get(rowIndex) + ',' + yColumns.get(cellIndex), value);
    yColKeep.set(yColumns.get(cellIndex), yDoc.clientID);
    yRowKeep.set(yRows.get(rowIndex), yDoc.clientID);
  }

  // - Context menu selections
  function handleColumnContextMenuClick (index) {
    switch(index) {
      case 0:
      case 2:
        handleInsertCol(columnOpenIndex + (index/2));
        break;
      case 1:
        handleRemoveCol(columnOpenIndex);
        break;
      default:
        return console.log(`handleColumnContextMenuClick called with index out of bound: ${index}`);
    }
  }

  function handleRowContextMenuClick (index) {
    switch(index) {
      case 0:
      case 2:
        handleInsertRow(rowOpenIndex + (index/2));
        break;
      case 1:
        handleRemoveRow(rowOpenIndex);
        break;
      default:
        return console.log(`handleColumnContextMenuClick called with index out of bound: ${index}`);
    }
  }

  // Conversion function of index to alphabet
  function getColumnIndicator(colIndex) {
    return String.fromCharCode(colIndex + 65);
  }

  // States used for keeping track of context menu states
  const [columnOpen, setColumnOpen] = useState(false);
  const [rowOpen, setRowOpen] = useState(false);
  const [anchorColumnEl, setAnchorColumnEl] = useState(null);
  const [anchorRowEl, setAnchorRowEl] = useState(null);
  const [columnOpenIndex, setColumnOpenIndex] = useState(null);
  const [rowOpenIndex, setRowOpenIndex] = useState(null);

  // Context menu handlers for rows and columns, respectively, including closeHandlers
  const handleRowHeaderContextMenu = (event, index) => {
    event.preventDefault();
    setAnchorRowEl(event.currentTarget);
    setRowOpen(true);
    setRowOpenIndex(index);
  }

  const handleColumnHeaderContextMenu = (event, index) => {
    event.preventDefault();
    setAnchorColumnEl(event.currentTarget);
    setColumnOpen(true);
    setColumnOpenIndex(index);
  }
 
  const handleColumnClose = () => {
    setColumnOpen(false);
  }
 
  const handleRowClose = () => {
    setRowOpen(false);
  }

  // Main spreadsheet construction
  return (
    <div className="split">
      <table id='spreadsheetSim'>
        <thead>
          <tr className="firstRow">
              <th title='Right click for options'><img alt='MR' height='16em' src='https://cdn-icons-png.flaticon.com/512/3645/3645851.png'/></th>
              {headers.map((col, colIndex) => 
                <th key={colIndex} onContextMenu={event => handleColumnHeaderContextMenu(event, colIndex)}>{getColumnIndicator(colIndex)}</th>
              )}
              <th key="button" className="addButtons addColumnButton" rowSpan={2} onClick={() => handleInsertCol(yColumns.length)}>+</th>
          </tr>
          <tr>
            <th/>
            {headers.map((col, colIndex) => 
                <th key={colIndex}>
                  <input
                    type="text"
                    value={col}
                    onChange={event => handleHeaderChange(colIndex, event.target.value)}
                    onBlur={event => handleHeaderBlur(colIndex, event.target.value)}

                  />  
                </th>
              )}
          </tr>
        </thead>  
        <tbody>
          {spreadsheet.map((row, rowIndex) => 
            <tr key={rowIndex}>
              <th onContextMenu={event => handleRowHeaderContextMenu(event, rowIndex)}>{rowIndex+1}</th>
              {row.map((cell, cellIndex) => (
              <td key={cellIndex}>
                <input
                  type="text"
                  value={cell || ''}
                  onChange={event => handleCellChange(rowIndex, cellIndex, event.target.value)}
                  onBlur={event => handleCellBlur(rowIndex, cellIndex, event.target.value)}
                />
              </td>
              ))}
            </tr>
          )}
        
          <tr>
            <th className="addButtons addRowButton" onClick={() => handleInsertRow(yRows.length)}>+</th>
          </tr>
        </tbody>
        <Menu
            id="columnContextMenu"
            anchorEl={anchorColumnEl}
            open={columnOpen}
            onClose={handleColumnClose}
            onClick={handleColumnClose}
        >
            {columnContextMenuItems.map((element, index) => (
                <MenuItem key={element.text} onClick={() => handleColumnContextMenuClick(index)}>
                  <ListItemIcon>
                      <img height='16em' src={element.image} alt={element.text}/>
                  </ListItemIcon>
                  <ListItemText primary={element.text}/>
                </MenuItem>
            ))}
        </Menu>
        <Menu
            id="rowContextMenu"
            anchorEl={anchorRowEl}
            open={rowOpen}
            onClose={handleRowClose}
            onClick={handleRowClose}
        >
            {rowContextMenuItems.map((element, index) => (
                <MenuItem key={element.text} onClick={() => handleRowContextMenuClick(index)}>
                  <ListItemIcon>
                      <img height='16em' src={element.image} alt={element.text}/>
                  </ListItemIcon>
                  <ListItemText primary={element.text}/>
                </MenuItem>
            ))}
        </Menu>
      </table>
      WebSocket:
      <div className='wsStatus'>
        {wsProvider.wsconnecting
          ? <span title='Connecting'><img alt={connectionStatus} height='16em' src="https://cdn-icons-png.flaticon.com/512/3031/3031712.png" /> Connecting to websocket...</span>
          : wsProvider.wsconnected
            ? <span title='Connected'><img alt={connectionStatus} height='16em' src="https://cdn-icons-png.flaticon.com/512/2983/2983692.png" /> <button onClick={() => wsProvider.disconnect()}>Disconnect</button></span>
            : <span title='Disonnected'><img alt={connectionStatus} height='16em' src="https://cdn-icons-png.flaticon.com/512/1144/1144833.png" /> <button onClick={() => wsProvider.connect()}>Reconnect</button></span>
        }
      </div>
      yDoc: <br />
      <tt className='json'>
        <div>
          <b>Spreadsheet & Labels (yMap): </b><br />
          {JSON.stringify(yMap.toJSON(), null, '  ')}
        </div>
        <div>
          <b>Columns (yArray): </b><br />
          {JSON.stringify(yColumns.toJSON(),null,'  ')}
        </div>
        <div>
          <b>Rows (yArray): </b><br />
          {JSON.stringify(yRows.toJSON(),null,'  ')}
        </div>
        <div>
          <b>Keep Columns (yMap): </b><br />
          {JSON.stringify(yColKeep.toJSON(), null, '  ')}
        </div>
        <div>
          <b>Keep Rows (yMap): </b><br />
          {JSON.stringify(yRowKeep.toJSON(), null, '  ')}
        </div>
      </tt>
    </div>
  );
}

export default RemoveKeep;

