import React, { useState, useEffect } from 'react';
import Quagga from 'quagga'; // Import QuaggaJS library
import biulogo from './biulogo1.png'; // Import biulogo1.png
import './App.css';
import * as XLSX from 'xlsx'; // Import xlsx library

function App() {
  const [password, setPassword] = useState('');
  const [isPasswordCorrect, setIsPasswordCorrect] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [results, setResults] = useState([]);
  const [popupResult, setPopupResult] = useState(null);

  useEffect(() => {
    if (isPasswordCorrect) {
      // Initialize Quagga after the component mounts
      Quagga.init({
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: document.querySelector('#scanner-container'),
          constraints: {
            width: window.innerWidth, // Set scanner width to match screen width
            height: 230, // Set scanner height to 30 pixels
            facingMode: 'environment', // or user for front camera
          },
        },
        decoder: {
          readers: ['ean_reader'], // List of barcode types to scan
        },
      }, (err) => {
        if (err) {
          console.error('Quagga initialization failed: ', err);
          return;
        }
        console.log('Quagga initialization succeeded');
        Quagga.start(); // Start scanning automatically after initialization
      });
  
      // Add event listener for successful barcode scan
      Quagga.onDetected((data) => {
        const scannedData = {
          type: 'Barcode',
          data: data.codeResult.code,
          timestamp: new Date().toLocaleString() // Add current date and time
        };
        setScannedBarcode(scannedData.data);
        setPopupResult(scannedData);
      });

      // Cleanup function
      return () => {
        Quagga.stop();
      };
    }
  }, [isPasswordCorrect]); // Run effect only when isPasswordCorrect changes

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();
    if (password === 'FOS6606') {
      setIsPasswordCorrect(true);
    } else {
      alert('Incorrect password!');
    }
  };

  const handleScanButtonClick = () => {
    // Manually start the scanner when the button is clicked
    Quagga.start();
  };

  const handleManualInputChange = (event) => {
    setManualInput(event.target.value);
  };

  const handleAddManualResult = () => {
    const result = {
      type: 'Manual',
      data: manualInput,
      timestamp: new Date().toLocaleString()
    };
    setResults([...results, result]);
    setPopupResult(result);
  };

  const exportToExcel = () => {
    // Prepare data for export with timestamp as the first column
    const dataWithTimestamp = results.map((result) => {
      return { Timestamp: result.timestamp, Type: result.type, Data: result.data };
    });

    // Create a worksheet from the data
    const worksheet = XLSX.utils.json_to_sheet(dataWithTimestamp);

    // Create a new workbook and add the worksheet to Sheet2
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet2');

    // Write the workbook to an Excel file
    XLSX.writeFile(workbook, 'results.xlsx');
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={biulogo} className="App-logo" alt="biulogo" />
        {!isPasswordCorrect ? (
          <form onSubmit={handlePasswordSubmit} className="password-form">
            <label>
              Password:
              <input type="password" value={password} onChange={handlePasswordChange} />
            </label>
            <button type="submit">Submit</button>
          </form>
        ) : (
          <>
            <div id="scanner-container" className="scanner-container"></div>
            <button className="scan-button" onClick={handleScanButtonClick}>Scan Barcode</button>
            <button className="export-button" onClick={exportToExcel}>Export to Excel</button>
            {popupResult && (
              <div className="popup">
                <p>Scanned Result:</p>
                <p>Type: {popupResult.type}</p>
                <p>Data: {popupResult.data}</p>
                <button onClick={() => setPopupResult(null)}>Close</button>
              </div>
            )}
            {scannedBarcode ? (
              <p>Scanned Barcode: {scannedBarcode}</p>
            ) : (
              <div>
                <p>Barcode scanner not working? Enter manually:</p>
                <input type="text" value={manualInput} onChange={handleManualInputChange} />
                <button onClick={handleAddManualResult}>Add Manual Result</button>
              </div>
            )}
          </>
        )}
      </header>
    </div>
  );
}

export default App;
