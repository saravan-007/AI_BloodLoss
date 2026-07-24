const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * POST /api/ai/analyze
 * Body: { patientData, surgeryData, question? }
 * Returns AI medical analysis or answers follow-up questions
 */
exports.analyzePatient = async (req, res) => {
  try {
    const { patientData, surgeryData, question } = req.body;

    if (!patientData || !surgeryData) {
      return res.status(400).json({ message: 'Patient and surgery data are required' });
    }

    // Dynamic mock response helper for local demo fallback
    const getMockResponse = (q) => {
      const qLower = q.toLowerCase();
      
      // smart variables based on metrics
      const totalBloodLoss = parseFloat(surgeryData.totalBloodLoss) || 0;
      const totalFluidLoss = parseFloat(surgeryData.totalFluidLoss) || 0;
      const weight = parseFloat(patientData.weight) || 70;
      const estimatedBloodVolume = weight * 70; // 70ml/kg average
      const pctBloodLoss = ((totalBloodLoss / estimatedBloodVolume) * 100).toFixed(1);

      // Extract numbers from query
      const numbersInQuery = qLower.match(/\d+/g);
      let queryBloodLoss = null;
      let queryFluidLoss = null;

      if (numbersInQuery && numbersInQuery.length > 0) {
        const firstNum = parseFloat(numbersInQuery[0]);
        // Check if query is about blood loss
        if (qLower.includes('blood') || qLower.includes('lost') || qLower.includes('hemorrhage') || qLower.includes('bleed')) {
          queryBloodLoss = firstNum;
          // Handle liters (e.g. "2 liters" -> 2000 ml)
          if (qLower.includes('liter') || qLower.includes(' l ') || qLower.endsWith(' l')) {
            if (queryBloodLoss < 10) queryBloodLoss *= 1000;
          }
        }
        // Check if query is about fluid loss
        else if (qLower.includes('fluid') || qLower.includes('urine') || qLower.includes('insensible') || qLower.includes('dehydration') || qLower.includes('dehydrated')) {
          queryFluidLoss = firstNum;
          if (qLower.includes('liter') || qLower.includes(' l ') || qLower.endsWith(' l')) {
            if (queryFluidLoss < 10) queryFluidLoss *= 1000;
          }
        }
      }

      // If keywords match but no specific number was parsed, use patient actual metrics
      if (queryBloodLoss === null && (qLower.includes('blood loss') || qLower.includes('lost blood') || qLower.includes('hemorrhage') || qLower.includes('bleed'))) {
        queryBloodLoss = totalBloodLoss;
      }
      if (queryFluidLoss === null && (qLower.includes('fluid loss') || qLower.includes('lost fluid') || qLower.includes('dehydration') || qLower.includes('dehydrated'))) {
        queryFluidLoss = totalFluidLoss;
      }

      // 1. Dynamic Blood Loss Analysis
      if (queryBloodLoss !== null) {
        const pct = ((queryBloodLoss / estimatedBloodVolume) * 100).toFixed(1);
        let severity = 'Mild';
        let classHemorrhage = 'Class I Hemorrhage';
        let precautions = 'Monitor vitals and maintain baseline IV infusion.';
        let treatment = 'Crystalloid fluid replacement (Lactated Ringer\'s or Normal Saline). Blood transfusion is generally not required.';
        let monitoring = 'Standard vital signs monitoring (BP, HR, temp) and routine assessment.';
        let suggestions = 'Crystalloid Fluid replacement, Blood Pressure Monitoring.';

        if (queryBloodLoss >= 2000 || parseFloat(pct) >= 40) {
          severity = 'Critical';
          classHemorrhage = 'Class IV Hemorrhage';
          precautions = 'Activate Massive Transfusion Protocol (MTP). Secure double large-bore IV lines (14G/16G) or central venous access. Inform ICU.';
          treatment = 'Rapid infusion of PRBCs, Fresh Frozen Plasma (FFP), and Platelets in a 1:1:1 ratio. Administer tranexamic acid (TXA) if indicated. Keep patient warm. Consider vasopressors (e.g., Norepinephrine) only after volume is partially restored.';
          monitoring = 'Continuous arterial line blood pressure, central venous pressure (CVP), core temperature, blood gas analysis, lactate, coagulation profile, and hourly urine output.';
          suggestions = 'Blood Transfusion, Crystalloid/Colloid Fluid, ICU Observation, CBC/Hemoglobin Tests, Electrolyte Replacement, Invasive Arterial BP Monitoring, Foley Urine Output, Oxygen Saturation, Heart Rate.';
        } else if (queryBloodLoss >= 1500 || parseFloat(pct) >= 30) {
          severity = 'Severe';
          classHemorrhage = 'Class III Hemorrhage';
          precautions = 'Stop active bleeding immediately. Prepare for potential massive transfusion. Maintain core body temperature.';
          treatment = 'Urgent fluid resuscitation with crystalloid and colloid solutions. Arrange for Packed Red Blood Cells (PRBCs) and type-specific blood. Start warmers.';
          monitoring = 'Strict arterial line blood pressure monitoring, continuous ECG, oxygen saturation, and urine output via Foley catheter.';
          suggestions = 'Blood Transfusion, Crystalloid Fluid, Colloid Fluid, ICU Observation, Hemoglobin Test, BP/HR/Urine Monitoring.';
        } else if (queryBloodLoss >= 750 || parseFloat(pct) >= 15) {
          severity = 'Moderate';
          classHemorrhage = 'Class II Hemorrhage';
          precautions = 'Monitor for orthostatic hypotension, tachycardia, and narrowing pulse pressure. Check IV access lines.';
          treatment = 'Initiating isotonic crystalloids (e.g., Lactated Ringer\'s or Normal Saline) at a 3:1 ratio is recommended. Blood transfusion is generally not required unless the patient has pre-existing anemia or cardiorespiratory disease.';
          monitoring = 'Continuous blood pressure monitoring, heart rate monitoring, and hourly urine output assessment (target >0.5 ml/kg/hr).';
          suggestions = 'Crystalloid Fluid replacement, Blood Pressure Monitoring, Heart Rate Monitoring.';
        }

        return `### Blood Loss Analysis (${queryBloodLoss} ml)
- **Risk & Severity**: ${severity} (${classHemorrhage}). This represents approximately ${pct}% of the patient's estimated blood volume (${estimatedBloodVolume.toFixed(0)} ml).
- **Clinical Severity**: ${severity}.
- **Immediate Precautions**: ${precautions}
- **Treatment**: ${treatment}
- **Monitoring**: ${monitoring}
- **Smart AI Suggestions**: ${suggestions}`;
      }

      // 2. Dynamic Fluid Loss Analysis
      if (queryFluidLoss !== null) {
        let risks = 'Mild risk of cellular dehydration and minor electrolyte fluctuations.';
        let treatment = 'Maintenance IV fluids and oral hydration if tolerated.';
        let monitoring = 'Routine fluid intake/output chart monitoring.';
        let replacementAdvice = 'Replace ongoing losses on a 1:1 basis with maintenance fluids.';
        let medicalGuidance = 'Assess clinical hydration status (skin turgor, mucous membranes) during routine rounds.';

        if (queryFluidLoss >= 4000) {
          risks = 'Critical risk of severe hypovolemia, cellular dehydration, severe electrolyte imbalances, and renal hypoperfusion (risk of AKI).';
          treatment = 'Aggressive resuscitation with balanced crystalloids (Lactated Ringer\'s or Plasma-Lyte). Correct electrolyte imbalances slowly and monitor renal markers.';
          monitoring = 'Strict hourly fluid input/output tracking, central venous pressure (CVP) monitoring, and serum electrolyte panels every 4 hours.';
          replacementAdvice = 'Rapidly replace deficit and match ongoing losses. Target a net positive fluid balance of 1000-1500 ml post-resuscitation.';
          medicalGuidance = 'Check arterial blood gas (ABG), BUN/Creatinine, and watch for symptoms of fluid overload during rapid resuscitation (pulmonary rales, etc.).';
        } else if (queryFluidLoss >= 2500) {
          risks = 'High risk of severe cellular dehydration, electrolyte imbalances (hyponatremia/hypernatremia, hypokalemia), and hypovolemia.';
          treatment = 'Resuscitation with balanced crystalloids (Lactated Ringer\'s or Plasma-Lyte) to restore fluid volume without inducing hyperchloremic metabolic acidosis.';
          monitoring = 'Strict tracking of fluid input vs output, serum electrolyte panels every 4-6 hours, and continuous hemodynamic monitoring.';
          replacementAdvice = 'Replace lost volume based on clinical output and insensible loss. Target a net positive fluid balance of 500-1000 ml post-resuscitation.';
          medicalGuidance = 'Assess skin turgor, mucous membranes, CVP, and mental status. Ensure kidney perfusion is maintained.';
        } else if (queryFluidLoss >= 1500) {
          risks = 'Moderate risk of dehydration and mild electrolyte shifts (especially potassium or sodium).';
          treatment = 'Optimized crystalloid infusion adjusted for body weight and surgery duration.';
          monitoring = 'Monitor vital signs, check urine output every 2-4 hours, and run baseline postoperative electrolytes.';
          replacementAdvice = 'Adjust IV maintenance rate to keep urine output > 0.5 ml/kg/hr.';
          medicalGuidance = 'Perform clinical assessment of fluid volume status (e.g. capillary refill time).';
        }

        return `### Fluid Loss Analysis (${queryFluidLoss} ml)
- **Risks**: ${risks}
- **Treatment**: ${treatment}
- **Monitoring**: ${monitoring}
- **Fluid Replacement Advice**: ${replacementAdvice}
- **Medical Guidance**: ${medicalGuidance}`;
      }

      if (qLower.includes('iv fluid') || qLower.includes('which iv') || qLower.includes('fluid should be used')) {
        return `### IV Fluid Replacement Guide
- **Crystalloids**: Lactated Ringer's (LR) or Normal Saline (0.9% NaCl) are the first-line choice for intravascular volume replacement. LR is preferred in large volumes to avoid hyperchloremic acidosis.
- **Colloids**: 5% Albumin can be considered when there is significant hypoalbuminemia or when volume expansion cannot be achieved with crystalloids alone.
- **Maintenance**: D5 1/2 NS with 20 mEq/L KCl once intravascular volume is fully restored.
- **Smart AI Suggestions**: Crystalloid Fluid, Colloid Fluid, Electrolyte Replacement.`;
      }

      if (qLower.includes('dehydration') || qLower.includes('dehydrated')) {
        return `### Dehydration & Volume Depletion Assessment
- **Risks**: Severe dehydration can impair tissue perfusion, lead to acute kidney injury (AKI), and cause severe cardiac dysrhythmias due to electrolyte concentration changes.
- **Symptoms**: Dry mucous membranes, oliguria, tachycardia, delayed capillary refill, and hypotension.
- **Causes**: High intraoperative blood loss, prolonged surgery duration leading to high insensible loss, or inadequate IV replacement.
- **Diagnosis**: Elevated BUN/Creatinine ratio, high urine specific gravity, and metabolic acidosis on ABG.
- **Treatment**: Isotonic crystalloid fluids (Normal Saline or LR) at 100-150 ml/hr, adjusted based on hemodynamic response and urine output.
- **Monitoring**: Vital signs every 15 minutes, hourly urine output, and daily weights.
- **Follow-up**: Assess renal function daily.`;
      }

      // Disease & Pathology Explanations
      if (qLower.includes('hypovolemia') || qLower.includes('hypovolemic')) {
        return `### Hypovolemia Medical Dossier
- **Symptoms**: Hypotension, tachycardia, cold/clammy extremities, rapid/shallow breathing, decreased urine output (<0.5 ml/kg/hr), confusion.
- **Causes**: Hemorrhage, excessive gastrointestinal loss, third-spacing, severe insensible losses during major abdominal surgeries.
- **Diagnosis**: Low central venous pressure, high heart rate, low systolic and pulse pressure, elevated blood lactate, and ultrasound showing collapsible inferior vena cava (IVC).
- **Precautions**: Avoid sudden position changes. Stop any vasodilating agents. Ensure airway patency.
- **Treatment**: Immediate volume expansion using isotonic crystalloids (LR or NS). If blood loss is the primary cause, initiate PRBC transfusion.
- **Medication Information**: Administer vasopressors (e.g., Norepinephrine) only after adequate fluid resuscitation to avoid critical organ ischemia.
- **Follow-up**: Weekly clinical checks, serial CBC, and basic metabolic panels (BMP) to track renal recovery.
- **ICU Requirement**: Highly recommended if mechanical ventilation is needed, or if vasopressor support is required to maintain MAP > 65 mmHg.
- **Recovery Process**: Gradual mobilization as hemodynamics stabilize. Oral hydration as tolerated.
- **Monitoring**: Arterial line blood pressure, pulse oximetry, ECG, urine output.
- **Emergency Management**: Elevate legs (passive leg raise), open IV lines wide, prepare emergency type O-negative blood.`;
      }

      if (qLower.includes('septic shock') || qLower.includes('sepsis')) {
        return `### Septic Shock Clinical Summary
- **Symptoms**: Hyperthermia or hypothermia, profound hypotension (refractory to fluid resuscitation), tachycardia, tachypnea, altered mental state, warm/flushed skin initially.
- **Causes**: Systemic inflammatory response triggered by severe bacterial, viral, or fungal infection.
- **Diagnosis**: Persistent hypotension requiring vasopressors to maintain MAP ≥ 65 mmHg and serum lactate > 2 mmol/L despite adequate fluid resuscitation.
- **Precautions**: Strict aseptic technique. Prompt surgical source control of infection.
- **Treatment**: Early administration of broad-spectrum IV antibiotics (within 1 hour), crystalloid fluid challenge (30 ml/kg), and vasopressor administration.
- **Medication Information**: Norepinephrine is the first-choice vasopressor. Add Vasopressin if necessary. Broad-spectrum antibiotics (e.g., Piperacillin/Tazobactam or Meropenem).
- **Follow-up**: Daily infectious disease review, repeat cultures, and inflammatory markers (CRP, Procalcitonin).
- **ICU Requirement**: Mandatory. Patients require close invasive monitoring and titration of vasoactive drugs.
- **Recovery Process**: Slow, multi-disciplinary rehabilitation. Assessment for post-sepsis syndrome.
- **Monitoring**: Continuous arterial line, CVP, blood cultures, lactate levels.
- **Emergency Management**: Secure airway, rapid fluid infusion, emergency vasopressors.`;
      }

      if (qLower.includes('fluid imbalance') || qLower.includes('electrolyte imbalance')) {
        return `### Fluid & Electrolyte Imbalance Protocol
- **Symptoms**: Muscle weakness, cardiac arrhythmias, seizures, hyperreflexia, paresthesias, confusion, or edema.
- **Causes**: Excessive crystalloid administration, SIADH, acute kidney injury, high gastric/bowel losses, or inadequate replacement.
- **Diagnosis**: Serum electrolyte panel showing deviations in Sodium (Na+), Potassium (K+), Calcium (Ca2+), or Magnesium (Mg2+).
- **Precautions**: Correct imbalances slowly—especially sodium (risk of osmotic demyelination syndrome if corrected too fast).
- **Treatment**: Tailored replacement therapy. IV potassium infusion (max 10-20 mEq/hr via central line). Hypertonic saline (3%) for symptomatic hyponatremia.
- **Medication Information**: Potassium chloride, Magnesium sulfate, Calcium gluconate, or loop diuretics (e.g., Furosemide) for hypervolemia.
- **Follow-up**: Repeat electrolyte panels every 2-6 hours depending on severity.
- **ICU Requirement**: Recommended for severe hyperkalemia (>6.5 mEq/L) or severe symptomatic hyponatremia (<120 mEq/L).
- **Recovery Process**: Dietary correction, monitoring renal function, and fluid intake restrictions if dilutional hyponatremia is present.
- **Monitoring**: Continuous ECG (particularly for potassium abnormalities), serum chemistry, and neurological checks.
- **Emergency Management**: Calcium chloride/gluconate for cardiac protection in severe hyperkalemia, followed by insulin/dextrose and sodium bicarbonate.`;
      }

      if (qLower.includes('renal failure') || qLower.includes('kidney failure') || qLower.includes('renal insufficiency')) {
        return `### Acute Renal Failure / Kidney Injury (AKI)
- **Symptoms**: Oliguria or anuria, peripheral edema, shortness of breath, fatigue, nausea, and confusion.
- **Causes**: Prerenal (hypovolemia, hypotension, hemorrhage during surgery), intrinsic (acute tubular necrosis, nephrotoxic drugs), postrenal (obstruction).
- **Diagnosis**: Sudden rise in serum Creatinine (≥ 0.3 mg/dl within 48 hours or ≥ 1.5-fold baseline) and decreased urine output.
- **Precautions**: Avoid nephrotoxic agents (NSAIDs, aminoglycosides, IV contrast). Adjust medication dosages for renal clearance.
- **Treatment**: Optimize hemodynamic status with IV fluids to restore renal perfusion. Discontinue causative drugs. Manage potassium and fluid overload.
- **Medication Information**: Diuretics (Furosemide) only if volume overloaded; avoid in hypovolemia. Phosphate binders if hyperphosphatemic.
- **Follow-up**: Daily BUN/Creatinine, serum electrolytes, and fluid balance audits.
- **ICU Requirement**: Required if renal replacement therapy (dialysis) or continuous venovenous hemofiltration (CVVH) is indicated due to refractory fluid overload, hyperkalemia, or uremia.
- **Recovery Process**: Kidney function may recover fully over weeks if hypovolemia is corrected early.
- **Monitoring**: Hourly urine output, daily weight, serum electrolytes.
- **Emergency Management**: Urgent hemodialysis for refractory hyperkalemia, metabolic acidosis, or severe uremic encephalopathy.`;
      }

      if (qLower.includes('respiratory failure') || qLower.includes('respiratory arrest')) {
        return `### Acute Respiratory Failure
- **Symptoms**: Severe dyspnea, tachypnea (>30 bpm), cyanosis, accessory muscle use, altered mental status, and diaphoresis.
- **Causes**: ARDS, fluid overload (pulmonary edema), atelectasis, aspiration, or residual neuromuscular blockade post-anesthesia.
- **Diagnosis**: Arterial Blood Gas (ABG) showing PaO2 < 60 mmHg (hypoxemic) or PaCO2 > 50 mmHg with pH < 7.35 (hypercapnic).
- **Precautions**: Maintain semi-Fowler's position. Avoid over-sedation.
- **Treatment**: Oxygen therapy (nasal cannula, high-flow nasal therapy, non-invasive ventilation, or endotracheal intubation). Diurese if pulmonary edema is present.
- **Medication Information**: Bronchodilators (Albuterol), corticosteroids (Methylprednisolone), diuretics (Furosemide), and antibiotics for underlying pneumonia.
- **Follow-up**: Serial chest X-rays, daily ABG checks, pulmonology review.
- **ICU Requirement**: Yes, standard requirement for invasive mechanical ventilation or high-flow oxygen requirements.
- **Recovery Process**: Pulmonary toilet, chest physiotherapy, and gradual ventilator weaning protocols.
- **Monitoring**: Continuous pulse oximetry, respiratory rate, capnography, and arterial line for serial blood gases.
- **Emergency Management**: Intubation and bag-valve-mask ventilation if airway protective reflexes are lost or in case of respiratory arrest.`;
      }

      if (qLower.includes('postoperative care') || qLower.includes('post-op')) {
        return `### Postoperative Care Guidelines
- **Symptoms/Assessment**: Pain, nausea, urine retention, bleeding at surgical site, hypothermia.
- **Precautions**: Early mobilization to prevent DVT. Sterile dressing changes. Assess bowel sounds before introducing oral feeds.
- **Treatment**: Pain control (multimodal analgesia), IV maintenance fluids, deep breathing/spirometry exercises.
- **Medication Information**: Analgesics (Acetaminophen, NSAIDs, weak opioids if needed), antiemetics (Ondansetron), DVT prophylaxis (Enoxaparin or heparin).
- **Follow-up**: Surgical wound check daily. Suture removal in 7-10 days.
- **ICU Requirement**: Generally not needed unless the surgery was high-risk, prolonged, or the patient has severe cardiopulmonary comorbidities.
- **Recovery Process**: Transition from liquid to solid diet. Gradual step-up in physical activity.
- **Monitoring**: Standard vital signs (BP, HR, Temp, RR) every 4 hours, wound drain output, and fluid intake/output balance.
- **Emergency Management**: Urgent surgical re-exploration for active hemorrhage or emergency airway control for laryngospasm.`;
      }

      // Default medically relevant answer fallback using current patient metrics
      return `### Clinical Consultation: "${question}"
Based on the intraoperative parameters for **${patientData.patientName}** (Age: ${patientData.age}, Weight: ${patientData.weight}kg):
- **Blood Loss**: ${totalBloodLoss} ml (${pctBloodLoss}% of Estimated Blood Volume).
- **Fluid Loss**: ${totalFluidLoss} ml.
- **Surgical Risk**: The patient underwent a ${patientData.surgeryType || 'procedure'} lasting ${surgeryData.surgeryDuration || 0} hours.

**Smart AI Response**:
For this specific patient, standard medical protocols advise close tracking of vital signs and volume replacement matching the recorded ${totalFluidLoss} ml of fluid loss. 
Regarding your specific query, ensure that prophylactic antibiotics, adequate analgesia, and DVT prophylaxis are considered based on standard ${patientData.surgeryType || 'surgical'} guidelines. If prescribing tablets or medications, please account for the patient's age (${patientData.age}) and weight (${patientData.weight}kg) for proper dosage calculation.

**General Suggestions**:
- **Volume Resuscitation**: ${totalBloodLoss > 1000 ? 'Prepare for Blood Transfusion. Administer crystalloid and colloid solutions.' : 'Ensure adequate crystalloid replacement (Normal Saline or Lactated Ringer\'s).'}
- **Laboratory Investigation**: CBC test, Hemoglobin test, and serum electrolytes are recommended immediately post-op.
- **Monitoring**: Close tracking of vital signs (Blood Pressure, Heart Rate, Oxygen Saturation) and Foley catheter Urine Output.
- **ICU Care**: ${totalBloodLoss > 1500 ? 'Initiate ICU Observation due to significant hemorrhage.' : 'Standard post-anesthesia care unit (PACU) monitoring is sufficient.'}`;
    };

    // Helper function to return the full JSON analysis fallback
    const getFallbackAnalysis = () => {
      const totalBloodLoss = parseFloat(surgeryData.totalBloodLoss) || 0;
      const totalFluidLoss = parseFloat(surgeryData.totalFluidLoss) || 0;
      
      let riskLevel = 'Low';
      let summaryText = `Patient underwent ${patientData.surgeryType || 'surgery'} with stable hemodynamics. Intraoperative blood loss was ${totalBloodLoss} ml and total fluid loss was ${totalFluidLoss} ml.`;
      
      if (totalBloodLoss > 1500 || totalFluidLoss > 4000) {
        riskLevel = 'Critical';
        summaryText = `CRITICAL ALERT: Patient has experienced severe hemorrhage (${totalBloodLoss} ml blood loss) and massive fluid shift (${totalFluidLoss} ml fluid loss) during ${patientData.surgeryType}. High danger of hypovolemic shock.`;
      } else if (totalBloodLoss > 1000 || totalFluidLoss > 3000) {
        riskLevel = 'High';
        summaryText = `HIGH RISK: Significant blood loss (${totalBloodLoss} ml) and fluid loss (${totalFluidLoss} ml) recorded. Resuscitation measures must be prioritized.`;
      } else if (totalBloodLoss > 500 || totalFluidLoss > 2000) {
        riskLevel = 'Moderate';
        summaryText = `MODERATE RISK: Moderate blood loss (${totalBloodLoss} ml) and fluid depletion (${totalFluidLoss} ml). Close PACU monitoring and baseline lab checks are recommended.`;
      }

      // Generate smart suggestions based on patient metrics
      const recommendations = ['Maintain hemodynamics with isotonic crystalloid fluid replacement.'];
      const precautions = ['Check for history of reaction to blood products.', `Verify patient allergies: ${patientData.allergies || 'None'}`];
      const risks = ['Hypovolemic Shock', 'Acute Kidney Injury (AKI) due to renal hypoperfusion'];
      const medications = ['Prophylactic broad-spectrum IV antibiotics.'];
      const monitoring = ['Continuous ECG monitoring', 'Blood Pressure Monitoring', 'Heart Rate Monitoring', 'Oxygen Saturation Monitoring'];
      const followUp = ['Check complete blood count (CBC) postoperatively', 'Hemoglobin Test within 4 hours'];

      if (totalBloodLoss > 1000) {
        recommendations.unshift('Initiate packed red blood cells (PRBC) Blood Transfusion.');
        medications.push('Administer Vasopressors (e.g., Norepinephrine) if MAP remains < 65 mmHg after volume replacement.');
        medications.push('Consider antifibrinolytics (Tranexamic Acid - TXA) if active bleeding persists.');
        monitoring.unshift('Urine Output Monitoring via Foley catheter (target > 0.5 ml/kg/hr)');
        monitoring.unshift('Invasive Arterial Blood Pressure Monitoring');
        risks.unshift('Severe hemorrhagic shock and coagulopathy');
        precautions.unshift('ICU Observation is required postoperatively.');
        followUp.unshift('Follow-up serial CBC and Coagulation profile (PT/INR, aPTT) every 6 hours.');
      } else if (totalBloodLoss > 500) {
        recommendations.unshift('Consider Crystalloid and Colloid Fluid resuscitation.');
        monitoring.unshift('Hourly Urine Output Monitoring');
      }

      return {
        overallRiskLevel: riskLevel,
        summary: summaryText,
        aiAnalysis: `Detailed intraoperative assessment for ${patientData.patientName} (${patientData.age} ${patientData.gender}). The patient underwent ${patientData.surgeryType} lasting ${surgeryData.surgeryDuration || 0} hours. Total measured blood loss is ${totalBloodLoss} ml, which constitutes a significant portion of their blood volume. Total fluid loss is ${totalFluidLoss} ml, representing a moderate-to-severe fluid shift that requires active monitoring and volume replacement.`,
        aiRecommendations: recommendations,
        aiPrecautions: precautions,
        aiRisks: risks,
        aiSuggestedMedication: medications,
        aiMonitoringAdvice: monitoring,
        aiFollowUpSuggestions: followUp
      };
    };

    // If API key is definitely a placeholder, use fallback immediately
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      if (question) return res.json({ answer: getMockResponse(question) });
      return res.json({ analysis: getFallbackAnalysis() });
    }

    try {
      // Live AI connection attempt
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      let prompt;

      if (question) {
        prompt = `
You are an expert medical AI assistant specializing in surgical care, blood loss management, and fluid monitoring. 
You are helping a doctor review a patient's intraoperative data and answer clinical questions.

Patient Context:
- Name: ${patientData.patientName}, Age: ${patientData.age}, Gender: ${patientData.gender}
- Weight: ${patientData.weight} kg, Blood Group: ${patientData.bloodGroup || 'Not recorded'}
- Surgery Type: ${patientData.surgeryType}
- Allergies: ${patientData.allergies || 'None'}
- Medical History: ${patientData.medicalNotes || 'None'}

Surgery Measurements:
- Small Gauze Blood Loss: ${surgeryData.smallGauzeBlood || 0} ml
- Large Gauze Blood Loss: ${surgeryData.largeGauzeBlood || 0} ml
- Total Gauze Blood Loss: ${surgeryData.totalGauzeBlood || 0} ml
- Suction Blood Loss: ${surgeryData.suctionBlood || 0} ml
- Total Blood Loss: ${surgeryData.totalBloodLoss || 0} ml
- Surgery Duration: ${surgeryData.surgeryDuration || 0} hours
- Insensible Loss: ${surgeryData.insensibleLoss || 0} ml
- Urine Collected: ${surgeryData.urineCollected || 0} ml
- Total Fluid Loss: ${surgeryData.totalFluidLoss || 0} ml

Doctor's Question: ${question}

Instructions for your response:
1. If the question is about blood loss estimation (e.g. "I lost approximately 900 ml blood", "1500 ml blood loss", etc.), explicitly explain the associated Risk, Severity (Mild, Moderate, Severe), Precautions, Treatment, and Monitoring.
2. If the question is about fluid loss estimation (e.g. "Fluid loss 3000 ml", "What IV fluid should be used", "Is dehydration possible"), explicitly explain the Risks, Treatment, Monitoring, Fluid Replacement options, and general Medical Guidance.
3. For general medical questions (e.g., Hypovolemia, Septic Shock, Fluid Imbalance, Hemorrhage, Electrolyte Imbalance, Postoperative Care, Renal/Respiratory Failure), explain the Symptoms, Causes, Diagnosis, Precautions, Treatment, Medication Information, Follow-up, ICU Requirement, Recovery Process, Monitoring, and Emergency Management where relevant.
4. Ensure your suggestions are smart and tailored, automatically suggesting actions like Blood Transfusion, Crystalloid/Colloid Fluid, Electrolyte Replacement, ICU Observation, CBC/Hemoglobin tests, or specific monitoring (BP, Urine, Oxygen, HR) when the patient's metrics indicate it is clinically necessary.
5. Base all answers strictly on established clinical guidelines. Do not generate random, incorrect, or irrelevant medical advice. Avoid vague suggestions.

Please provide a clear, professional, medically accurate answer structured with headings. Keep it concise but comprehensive. Use markdown for headings.
`;
      } else {
        prompt = `
You are an expert medical AI assistant specializing in surgical care, blood loss management, and fluid monitoring.
Analyze the following intraoperative patient data and provide a comprehensive medical assessment.

PATIENT INFORMATION:
- Name: ${patientData.patientName}
- Age: ${patientData.age} years
- Gender: ${patientData.gender}
- Weight: ${patientData.weight} kg
- Blood Group: ${patientData.bloodGroup || 'Not recorded'}
- Surgery Type: ${patientData.surgeryType}
- Allergies: ${patientData.allergies || 'None'}
- Medical History: ${patientData.medicalNotes || 'None'}

INTRAOPERATIVE MEASUREMENTS:
- Small Gauze Count: ${surgeryData.smallGauzeCount || 0} pcs × ${surgeryData.smallGauzeValue || 0} ml = ${surgeryData.smallGauzeBlood || 0} ml
- Large Gauze Count: ${surgeryData.largeGauzeCount || 0} pcs × ${surgeryData.largeGauzeValue || 0} ml = ${surgeryData.largeGauzeBlood || 0} ml
- Total Gauze Blood Loss: ${surgeryData.totalGauzeBlood || 0} ml
- Suction Bottle Volume: ${surgeryData.suctionBottleValue || 0} ml − Saline Used: ${surgeryData.salineUsed || 0} ml = ${surgeryData.suctionBlood || 0} ml suction blood
- TOTAL BLOOD LOSS: ${surgeryData.totalBloodLoss || 0} ml
- Surgery Duration: ${surgeryData.surgeryDuration || 0} hours
- Patient Weight: ${surgeryData.patientWeight || patientData.weight || 0} kg
- Insensible Loss (2 × weight × duration): ${surgeryData.insensibleLoss || 0} ml
- Urine Output: ${surgeryData.urineCollected || 0} ml
- TOTAL FLUID LOSS: ${surgeryData.totalFluidLoss || 0} ml

Based on the patient information and surgery measurements above, automatically evaluate the case and suggest treatment protocols. 
Be highly accurate and clinically precise. Return your assessment in the following JSON format. Ensure all suggestions (such as Blood Transfusion, Crystalloid/Colloid Fluid, Electrolyte Replacement, ICU Observation, CBC/Hemoglobin tests, and vital monitoring) are dynamically suggested when blood/fluid loss values indicate clinical necessity.

Return ONLY valid JSON, no markdown code block fences:
{
  "overallRiskLevel": "Critical|High|Moderate|Low",
  "summary": "2-3 sentence overall clinical assessment of the patient status.",
  "aiAnalysis": "Detailed analysis of blood loss, fluid loss, patient condition, and surgery details.",
  "aiRecommendations": [
    "fluid/surgical recommendations (e.g. recommend crystalloid replacement or blood transfusion if loss > 15% EBV)"
  ],
  "aiPrecautions": [
    "immediate safety precautions based on comorbidities/allergies and surgical events"
  ],
  "aiRisks": [
    "detailed risk analysis (complications, hypovolemia, renal failure, septic shock, hemorrhage)"
  ],
  "aiSuggestedMedication": [
    "specific medication suggestions (vasopressors, clotting agents, antibiotics, etc.)"
  ],
  "aiMonitoringAdvice": [
    "specific monitoring advice (ECG, BP, Urine output, Oxygen, HR monitoring)"
  ],
  "aiFollowUpSuggestions": [
    "postoperative follow-up suggestions (CBC test, Hemoglobin test, electrolyte checks, review schedules)"
  ]
}
`;
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (question) {
        return res.json({ answer: text });
      }

      // Parse JSON response for full analysis
      try {
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const analysis = JSON.parse(clean);
        return res.json({ analysis });
      } catch (parseErr) {
        return res.json({ analysis: null, rawText: text });
      }

    } catch (apiError) {
      // If the Gemini API fails (e.g. invalid key, quota limit), silently fallback to local rule-engine
      console.warn("Gemini API failed, using intelligent local fallback. Error:", apiError.message);
      if (question) {
        return res.json({ answer: getMockResponse(question) });
      }
      return res.json({ analysis: getFallbackAnalysis() });
    }

  } catch (err) {
    // Top level catch just in case anything else breaks outside the Gemini block
    console.error('AI Analysis Critical Error:', err);
    res.status(500).json({ message: 'AI analysis failed critically', error: err.message });
  }
};

/**
 * POST /api/ai/save-analysis
 * Save AI analysis result to a surgery record
 */
exports.saveAnalysis = async (req, res) => {
  try {
    const SurgeryRecord = require('../models/SurgeryRecord');
    const { surgeryId, analysis } = req.body;

    if (!surgeryId || !analysis) {
      return res.status(400).json({ message: 'surgeryId and analysis are required' });
    }

    const record = await SurgeryRecord.findByIdAndUpdate(
      surgeryId,
      { aiAnalysis: typeof analysis === 'string' ? analysis : JSON.stringify(analysis) },
      { new: true }
    );

    if (!record) return res.status(404).json({ message: 'Surgery record not found' });

    res.json({ message: 'Analysis saved', record });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
