import './App.css';
import React, { useState, useEffect } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

const yDoc = new Y.Doc();
const wsProvider = new WebsocketProvider('ws://localhost:1234', 'naive', yDoc);
const ySpreadsheet = yDoc.getArray('rows');
const yHeaders = yDoc.getArray('headers');

function Naive() {

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
      yHeaders.push(["XYZ"]);
      const yRow = Y.Array.from(['','','']);
      ySpreadsheet.push([yRow]);
    }
  }

  const [connectionStatus, setConnectionStatus] = useState('');

  useEffect(() => {
    // Track & update connection status to properly update document on connection change.
    wsProvider.on('status', event => {
      setConnectionStatus(event.status);
    });
    // Initialize yDoc on first connect.
    wsProvider.once('sync', () => {
      if (ySpreadsheet.length === 0) {
        initialize();
      } else {
        rebuildSpreadsheet();
  
      }
    });
    // yArray observers. Handle structural changes
    ySpreadsheet.observeDeep(() => rebuildSpreadsheet());
    yHeaders.observe(() => rebuildSpreadsheet());
  }, []);

  function rebuildSpreadsheet() {
    setHeaders(yHeaders.toArray());
    
    const newSpreadsheet = Array(ySpreadsheet.length);
    for (let i = 0; i < ySpreadsheet.length; i++) {
      newSpreadsheet[i] = Array.apply(null, Array(ySpreadsheet.get(i).length)).map(function () {return undefined});
    }
    ySpreadsheet.forEach((row,rowIndex) => row.forEach((value,colIndex) => newSpreadsheet[rowIndex][colIndex] = value))
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
    yHeaders.delete(colIndex);
    yHeaders.insert(colIndex, [value]);
  }

  // - Row & column insertion
  const handleInsertRow = (index) => {
    const yRow = new Y.Array();
    yRow.push(Array.apply(null, Array(yHeaders.length)).map(function () {return ""}))
    ySpreadsheet.insert(index, [yRow]);
  }

  const handleInsertCol = (index) => {
    yHeaders.insert(index,["XYZ"]);
    for (let i = 0; i < ySpreadsheet.length; i++) {
      ySpreadsheet.get(i).insert(index, ['']);
    }
  }

  const handleDeleteCol = (index) => {
    ySpreadsheet.forEach(row => row.delete(index));
    yHeaders.delete(index);
  }

  // - Cell change
  const handleCellChange = (rowIndex, colIndex, value) => {
    const newSpreadsheet = [...spreadsheet];
    newSpreadsheet[rowIndex][colIndex] = value;
    setSpreadsheet(newSpreadsheet);
  };

  const handleCellBlur = (rowIndex, colIndex, value) => {
    if ((value === ySpreadsheet.get(rowIndex).get(colIndex))) return;
    ySpreadsheet.get(rowIndex).delete(colIndex);
    ySpreadsheet.get(rowIndex).insert(colIndex, [value]);
  }

  // - Context menu selections
  function handleColumnContextMenuClick (index) {
    switch(index) {
      case 0:
      case 2:
        handleInsertCol(columnOpenIndex + (index/2));
        break;
      case 1:
        handleDeleteCol(columnOpenIndex);
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
        ySpreadsheet.delete(rowOpenIndex);
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
              <th key="button" className="addButtons addColumnButton" rowSpan={2} onClick={() => handleInsertCol(ySpreadsheet.get(0).length)}>+</th>
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
            <th className="addButtons addRowButton" onClick={() => handleInsertRow(ySpreadsheet.length)}>+</th>
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
          <b>Nested Array (yArray of yArrays): </b><br />
          {JSON.stringify(ySpreadsheet.toJSON(), null, '  ')}
        </div>
        <div>
          <b>Headers (yArray):</b><br />
          {JSON.stringify(yHeaders.toJSON(), null, '  ')}
        </div>
      </tt>
    </div>
  );
}

export default Naive;
