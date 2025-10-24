import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const BarcodeTest: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      try {
        console.log('Testing barcode generation...');
        
        // Clear canvas
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 300, 100);
        }

        // Generate barcode
        JsBarcode(canvasRef.current, "1234567890", {
          format: "CODE128",
          width: 2,
          height: 80,
          displayValue: false, // Remove the label
          background: '#ffffff',
          lineColor: '#000000',
          margin: 5,
        });

        console.log('Barcode test completed successfully');
      } catch (error) {
        console.error('Barcode test error:', error);
      }
    }
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Barcode Test</h2>
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={100}
        style={{ border: '1px solid #ccc' }}
      />
      <p className="mt-2 text-sm text-gray-600">
        This should show a CODE128 barcode for "1234567890"
      </p>
    </div>
  );
};

export default BarcodeTest;
