// Shared surgery workflow context — holds state across all 6 steps
import React, { createContext, useContext, useState } from 'react';

const SurgeryContext = createContext(null);

export const SurgeryProvider = ({ children }) => {
  const [data, setData] = useState({
    // Step 1 — Gauze
    smallGauzeCount: '', smallGauzeValue: '',
    largeGauzeCount: '', largeGauzeValue: '',
    smallGauzeBlood: 0, largeGauzeBlood: 0, totalGauzeBlood: 0,
    // Step 2 — Suction
    suctionBottleValue: '', salineUsed: '', suctionBlood: 0,
    // Step 3 — Total Blood
    totalBloodLoss: 0,
    // Step 4 — Insensible
    surgeryDuration: '', patientWeight: '', insensibleLoss: 0,
    // Step 5 — Urine
    urineCollected: '',
    // Step 6 — Total Fluid
    totalFluidLoss: 0,
  });

  const update = (updates) => setData(d => ({ ...d, ...updates }));

  return <SurgeryContext.Provider value={{ data, update }}>{children}</SurgeryContext.Provider>;
};

export const useSurgery = () => {
  const ctx = useContext(SurgeryContext);
  if (!ctx) throw new Error('useSurgery must be inside SurgeryProvider');
  return ctx;
};
