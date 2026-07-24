// Nurse Patients — uses the same Patients component logic
import React from 'react';
import Patients from '../doctor/Patients';

// Override navigation to use /nurse/ routes by checking auth context role
export default function NursePatients() {
  return <Patients />;
}
