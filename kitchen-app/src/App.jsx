import React from 'react';
import KitchenDisplay from './pages/KitchenDisplay';
import './styles/global.css';

function App() {
  return (
    <div className="App">
      {/* NO NAVIGATION - Full screen kitchen display only */}
      <KitchenDisplay />
    </div>
  );
}

export default App;