// En src/components/DisplayField.jsx

import React from 'react';

const fieldStyle = {
  marginBottom: '10px', 
};

const labelStyle = {
  fontWeight: 'bold',
  color: '#333',
  marginRight: '8px',
};

const valueStyle = {
  textTransform: 'uppercase',
  color: '#555',
};

function DisplayField({ label, value }) {
  const displayValue = value || 'No especificado';

  return (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{displayValue}</span>
    </div>
  );
}

export default DisplayField;
