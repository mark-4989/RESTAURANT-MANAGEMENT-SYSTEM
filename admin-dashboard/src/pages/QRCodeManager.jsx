// admin-dashboard/src/pages/QRCodeManager.jsx
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../styles/qr-manager.css';

const QRCodeManager = () => {
  const [startTable, setStartTable] = useState(1);
  const [endTable, setEndTable] = useState(10);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);

  const generateQRCodes = async () => {
    try {
      setLoading(true);

      const response = await fetch('http://localhost:5000/api/qr-codes/generate-multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTable,
          endTable,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQrCodes(data.data.qrCodes);
      }
    } catch (error) {
      console.error('Error generating QR codes:', error);
      alert('Failed to generate QR codes');
    } finally {
      setLoading(false);
    }
  };

  const printQRCode = (tableNumber) => {
    const printWindow = window.open(
      `http://localhost:5000/api/qr-codes/print/${tableNumber}`,
      '_blank'
    );
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const downloadQRCode = (qrCode) => {
    const link = document.createElement('a');
    link.href = qrCode.qrCodeDataUrl;
    link.download = `table-${qrCode.tableNumber}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printAll = () => {
    qrCodes.forEach((qrCode, index) => {
      setTimeout(() => {
        printQRCode(qrCode.tableNumber);
      }, index * 1000);
    });
  };

  return (
    <div className="qr-manager-page">
      <div className="qr-manager-header">
        <h1>📱 QR Code Manager</h1>
        <p>Generate and manage table QR codes for contactless ordering</p>
      </div>

      {/* Generator Section */}
      <div className="qr-generator-section glass-card">
        <h2>Generate QR Codes</h2>
        <div className="generator-form">
          <div className="form-group">
            <label>Start Table Number:</label>
            <input
              type="number"
              min="1"
              value={startTable}
              onChange={(e) => setStartTable(parseInt(e.target.value))}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>End Table Number:</label>
            <input
              type="number"
              min={startTable}
              value={endTable}
              onChange={(e) => setEndTable(parseInt(e.target.value))}
              className="form-input"
            />
          </div>

          <button
            onClick={generateQRCodes}
            disabled={loading}
            className="generate-btn"
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Generating...
              </>
            ) : (
              <>
                ✨ Generate QR Codes
              </>
            )}
          </button>
        </div>

        {qrCodes.length > 0 && (
          <div className="bulk-actions">
            <button onClick={printAll} className="bulk-action-btn">
              🖨️ Print All ({qrCodes.length})
            </button>
            <p className="bulk-action-note">
              Will open {qrCodes.length} print dialogs one by one
            </p>
          </div>
        )}
      </div>

      {/* QR Codes Grid */}
      {qrCodes.length > 0 && (
        <div className="qr-codes-section">
          <h2>Generated QR Codes ({qrCodes.length})</h2>
          <div className="qr-codes-grid">
            {qrCodes.map((qrCode) => (
              <div
                key={qrCode.tableNumber}
                className="qr-code-card glass-card"
                onClick={() => setSelectedTable(qrCode)}
              >
                <div className="qr-code-header">
                  <h3>Table {qrCode.tableNumber}</h3>
                  <span className="table-badge">#{qrCode.tableNumber}</span>
                </div>

                <div className="qr-code-display">
                  <QRCodeSVG
                    value={qrCode.orderUrl}
                    size={200}
                    level="H"
                    includeMargin={true}
                    fgColor="#667eea"
                  />
                </div>

                <div className="qr-code-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      printQRCode(qrCode.tableNumber);
                    }}
                    className="qr-action-btn print"
                  >
                    🖨️ Print
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadQRCode(qrCode);
                    }}
                    className="qr-action-btn download"
                  >
                    ⬇️ Download
                  </button>
                </div>

                <div className="qr-code-url">
                  <small>{qrCode.orderUrl}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {selectedTable && (
        <div className="modal-overlay" onClick={() => setSelectedTable(null)}>
          <div className="modal-content qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Table {selectedTable.tableNumber} - QR Code</h2>
              <button
                className="close-btn"
                onClick={() => setSelectedTable(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="qr-preview">
                <div className="restaurant-name">🍽️ DineSmart</div>
                <div className="table-number-large">
                  Table {selectedTable.tableNumber}
                </div>

                <div className="qr-display-large">
                  <QRCodeSVG
                    value={selectedTable.orderUrl}
                    size={400}
                    level="H"
                    includeMargin={true}
                    fgColor="#667eea"
                  />
                </div>

                <div className="scan-instructions">
                  <p><strong>📱 Scan to Order!</strong></p>
                  <p>Point your camera at this QR code to view menu and place order.</p>
                </div>

                <div className="preview-actions">
                  <button
                    onClick={() => printQRCode(selectedTable.tableNumber)}
                    className="preview-btn print-full"
                  >
                    🖨️ Print Full Page
                  </button>
                  <button
                    onClick={() => downloadQRCode(selectedTable)}
                    className="preview-btn download-full"
                  >
                    ⬇️ Download PNG
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="qr-instructions glass-card">
        <h3>💡 How to Use QR Codes</h3>
        <ol>
          <li>Generate QR codes for your table range</li>
          <li>Print each QR code (full page or small sticker)</li>
          <li>Place QR codes on tables (laminated stand-up cards work best)</li>
          <li>Customers scan with phone camera to view menu & order</li>
          <li>Orders automatically include table number</li>
        </ol>

        <div className="qr-tips">
          <h4>📌 Best Practices:</h4>
          <ul>
            <li>✅ Print on waterproof/laminated material</li>
            <li>✅ Use table stands or acrylic holders</li>
            <li>✅ Test QR codes before placing on tables</li>
            <li>✅ Keep QR codes at eye level when seated</li>
            <li>✅ Clean QR codes regularly for best scanning</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QRCodeManager;