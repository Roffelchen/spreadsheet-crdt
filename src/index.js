import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import FixedElements from './FixedElements';
import RemoveKeep from './RemoveKeep';
import Naive from './Naive';
import NestedMap from './NestedMap';

const openModeTab = (evt, mode) => {
  const modeContent = document.getElementsByClassName("modeTabContent");
  for (let i = 0; i < modeContent.length; i++) {
    modeContent[i].style.display = "none";
  }
  const modeTabs = document.getElementsByClassName("modeTab");
  for (let i = 0; i < modeTabs.length; i++) {
    modeTabs[i].className = modeTabs[i].className.replace(" active", "");
  }
  document.getElementById(mode).style.display = "block";
  evt.currentTarget.className += " active";
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <div className='tab'>
      <button className='modeTab active' onClick={event => openModeTab(event, 'naive')}>Naive</button>
      <button className='modeTab' onClick={event => openModeTab(event, 'nested')}>Nested Map</button>
      <button className='modeTab' onClick={event => openModeTab(event, 'removeWins')}>Fixed Elements</button>
      <button className='modeTab' onClick={event => openModeTab(event, 'removeKeep')}>Fixed Elements<br /><small>(Remove-keep)</small></button>
    </div>
    <div id="removeWins" className="modeTabContent" style={{ display: 'none' }}>
      <FixedElements />
    </div>
    <div  id="naive" className="modeTabContent">
      <Naive />
    </div>
    <div  id="nested" className="modeTabContent" style={{ display: 'none' }}>
      <NestedMap />
    </div>
    <div  id="removeKeep" className="modeTabContent" style={{ display: 'none' }}>
      <RemoveKeep />
    </div>
  </React.StrictMode>
);