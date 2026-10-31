/**
 * Clinical Drug-Allergy & Drug-Interaction Safety Engine
 * Alem Ketema Enat Hospital Management System
 * Knowledge Base formulated from Ethiopian National Drug Formulary (NDF) & WHO Model Formulary
 * Clinical Rule Version: ET-NDF-2026.1
 */

const pool = require('../config/database');

const CLINICAL_RULE_VERSION = 'ET-NDF-2026.1';

/**
 * Curated Clinical Drug Classes & Allergy Cross-Reactivity Rules
 */
const CLINICAL_DRUG_CLASSES = {
  penicillins: {
    className: 'Penicillin-Class Beta-Lactam Antibiotic',
    members: ['penicillin', 'penicillin g', 'penicillin v', 'amoxicillin', 'ampicillin', 'augmentin', 'amoxicillin-clavulanate', 'piperacillin', 'cloxacillin', 'flucloxacillin', 'methicillin', 'amoxil'],
    crossReactivity: [
      {
        targetClass: 'penicillins',
        risk: 'high',
        message: 'PATIENT ALLERGY ALERT: Potential cross-reactivity detected. Review the patient\'s allergy history and clinical risk before prescribing.'
      },
      {
        targetClass: 'cephalosporins',
        risk: 'moderate',
        message: 'PATIENT ALLERGY ALERT: Potential cross-reactivity detected. Review the patient\'s allergy history and clinical risk before prescribing.'
      }
    ]
  },
  cephalosporins: {
    className: 'Cephalosporin Antibiotic',
    members: ['ceftriaxone', 'cefotaxime', 'cefuroxime', 'cefalexin', 'cephalexin', 'cefazolin', 'cephradine', 'cefepime', 'cefpodoxime', 'cefixime', 'rocephin'],
    crossReactivity: [
      {
        targetClass: 'penicillins',
        risk: 'moderate',
        message: 'PATIENT ALLERGY ALERT: Potential cross-reactivity detected. Review the patient\'s allergy history and clinical risk before prescribing.'
      }
    ]
  },
  sulfonamides: {
    className: 'Sulfonamide (Sulfa) Antimicrobial',
    members: ['sulfamethoxazole', 'cotrimoxazole', 'co-trimoxazole', 'bactrim', 'septra', 'trimethoprim-sulfamethoxazole', 'silver sulfadiazine', 'sulfadiazine', 'sulfasalazine'],
    crossReactivity: []
  },
  nsaids: {
    className: 'Non-Steroidal Anti-Inflammatory Drug (NSAID)',
    members: ['aspirin', 'acetylsalicylic acid', 'ibuprofen', 'diclofenac', 'naproxen', 'meloxicam', 'ketoprofen', 'indomethacin', 'piroxicam', 'celecoxib', 'voltaren', 'brufen'],
    crossReactivity: []
  },
  macrolides: {
    className: 'Macrolide Antibiotic',
    members: ['erythromycin', 'clarithromycin', 'azithromycin', 'roxithromycin'],
    crossReactivity: []
  },
  fluoroquinolones: {
    className: 'Fluoroquinolone Antibiotic',
    members: ['ciprofloxacin', 'levofloxacin', 'moxifloxacin', 'norfloxacin', 'ofloxacin', 'cipro'],
    crossReactivity: []
  },
  opioids: {
    className: 'Opioid Analgesic',
    members: ['morphine', 'codeine', 'tramadol', 'pethidine', 'meperidine', 'fentanyl', 'oxycodone'],
    crossReactivity: []
  },
  tetracyclines: {
    className: 'Tetracycline Antibiotic',
    members: ['doxycycline', 'tetracycline', 'minocycline', 'oxytetracycline'],
    crossReactivity: []
  },
  aminoglycosides: {
    className: 'Aminoglycoside Antibiotic',
    members: ['gentamicin', 'amikacin', 'tobramycin', 'streptomycin', 'neomycin'],
    crossReactivity: []
  }
};

/**
 * Validated Drug-Drug Interaction (DDI) Ruleset
 * Sourced from WHO Model Formulary & Ethiopian National Drug Formulary (NDF).
 */
const VALIDATED_DRUG_INTERACTIONS = [
  {
    id: 'DDI-001',
    drugA: ['warfarin', 'coumadin'],
    drugB: ['aspirin', 'ibuprofen', 'diclofenac', 'naproxen', 'meloxicam', 'ketoprofen', 'indomethacin'],
    severity: 'severe',
    interactionType: 'pharmacodynamic_synergism',
    mechanism: 'Concomitant anticoagulation and platelet inhibition significantly amplifies the risk of major gastrointestinal and systemic hemorrhage.',
    management: 'Avoid co-prescription where possible. If antiplatelet therapy is strictly indicated, consider gastroprotection with a PPI and monitor INR closely.'
  },
  {
    id: 'DDI-002',
    drugA: ['enalapril', 'lisinopril', 'captopril', 'ramipril'],
    drugB: ['spironolactone', 'potassium chloride', 'potassium'],
    severity: 'severe',
    interactionType: 'pharmacodynamic_synergism',
    mechanism: 'Combined renin-angiotensin-aldosterone blockade with potassium-sparing agents creates high risk of severe hyperkalemia and fatal cardiac dysrhythmias.',
    management: 'Monitor serum potassium and renal function (eGFR/creatinine) within 1-2 weeks of initiation.'
  },
  {
    id: 'DDI-003',
    drugA: ['theophylline', 'aminophylline'],
    drugB: ['ciprofloxacin', 'norfloxacin'],
    severity: 'moderate',
    interactionType: 'cyp1a2_inhibition',
    mechanism: 'Fluoroquinolones inhibit hepatic CYP1A2 metabolism of theophylline, causing marked theophylline accumulation, tachycardia, tremors, and seizures.',
    management: 'Reduce theophylline dosage by 30-50% and monitor plasma theophylline concentrations, or choose an alternative antimicrobial.'
  },
  {
    id: 'DDI-004',
    drugA: ['methotrexate'],
    drugB: ['aspirin', 'ibuprofen', 'diclofenac', 'naproxen'],
    severity: 'severe',
    interactionType: 'renal_clearance_reduction',
    mechanism: 'NSAIDs reduce renal tubular clearance of methotrexate, resulting in potentially fatal bone marrow aplasia and hepatotoxicity.',
    management: 'Avoid concurrent administration of NSAIDs with intermediate or high-dose methotrexate.'
  },
  {
    id: 'DDI-005',
    drugA: ['simvastatin', 'atorvastatin'],
    drugB: ['clarithromycin', 'erythromycin'],
    severity: 'moderate',
    interactionType: 'cyp3a4_inhibition',
    mechanism: 'Macrolides potently inhibit CYP3A4, dramatically elevating statin bioavailability and increasing the incidence of myopathy and rhabdomyolysis.',
    management: 'Temporarily suspend statin therapy during the antibiotic course or substitute azithromycin.'
  }
];

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findDrugClass(medicationName) {
  const normMed = normalizeName(medicationName);
  if (!normMed) return null;

  for (const [classKey, classDef] of Object.entries(CLINICAL_DRUG_CLASSES)) {
    for (const member of classDef.members) {
      const normMember = normalizeName(member);
      if (normMed.includes(normMember) || normMember.includes(normMed)) {
        return { classKey, classDef, matchedMember: member };
      }
    }
  }
  return null;
}

/**
 * Check a proposed medication against active patient prescriptions for Drug-Drug Interactions
 */
async function checkDrugDrugInteractions(patientId, proposedMedication) {
  const normProposed = normalizeName(proposedMedication);
  const interactions = [];

  // Query active / non-dispensed or recent prescriptions (past 30 days)
  const activeRxRes = await pool.query(`
    SELECT id, medication_name, dosage, frequency, prescribed_date
    FROM prescriptions
    WHERE patient_id = $1
      AND prescribed_date >= NOW() - INTERVAL '30 days'
  `, [patientId]);

  for (const rx of activeRxRes.rows) {
    const normActive = normalizeName(rx.medication_name);
    if (!normActive || normActive === normProposed) continue;

    for (const rule of VALIDATED_DRUG_INTERACTIONS) {
      const matchA = rule.drugA.some(d => normProposed.includes(d) || d.includes(normProposed));
      const matchB = rule.drugB.some(d => normActive.includes(d) || d.includes(normActive));
      const matchRevA = rule.drugA.some(d => normActive.includes(d) || d.includes(normActive));
      const matchRevB = rule.drugB.some(d => normProposed.includes(d) || d.includes(normProposed));

      if ((matchA && matchB) || (matchRevA && matchRevB)) {
        interactions.push({
          ruleId: rule.id,
          proposedMedication,
          interactingMedication: rx.medication_name,
          prescriptionId: rx.id,
          severity: rule.severity,
          interactionType: rule.interactionType,
          mechanism: rule.mechanism,
          management: rule.management,
          ruleVersion: CLINICAL_RULE_VERSION
        });
      }
    }
  }

  return interactions;
}

/**
 * Unified Clinical Safety Check (Allergies + Drug Interactions + Missing History Status)
 * @param {number} patientId
 * @param {string} proposedMedication
 */
async function checkMedicationAllergy(patientId, proposedMedication) {
  // 1. Fetch patient allergy records
  const allergiesRes = await pool.query(`
    SELECT * FROM patient_allergies
    WHERE patient_id = $1 AND verification_status != 'refuted'
  `, [patientId]);

  // Demographic and legacy allergies text
  const patRes = await pool.query(`
    SELECT id, first_name, last_name, allergies FROM patients WHERE id = $1
  `, [patientId]);

  if (!patRes.rows.length) {
    throw new Error('Patient not found');
  }

  const patient = patRes.rows[0];
  const structuredAllergies = allergiesRes.rows;
  const legacyAllergyText = patient.allergies ? patient.allergies.trim() : '';

  const alerts = [];
  const normProposed = normalizeName(proposedMedication);
  const proposedClassInfo = findDrugClass(proposedMedication);

  // 2. Evaluate allergy records
  for (const allergy of structuredAllergies) {
    const normAllergen = normalizeName(allergy.allergen_name);
    const allergenClassInfo = findDrugClass(allergy.allergen_name);

    let matchType = null;
    let reason = '';
    let recommendation = '';
    let alertMessage = "PATIENT ALLERGY ALERT: Potential cross-reactivity detected. Review the patient's allergy history and clinical risk before prescribing.";

    // Direct / active ingredient match
    if (normProposed.includes(normAllergen) || normAllergen.includes(normProposed)) {
      matchType = 'exact_or_active_ingredient';
      reason = `The proposed medication "${proposedMedication}" directly matches recorded allergen "${allergy.allergen_name}".`;
      recommendation = `CONTRAINDICATED. Select an alternative therapeutic class.`;
      alertMessage = `PATIENT ALLERGY ALERT: Direct match detected for "${allergy.allergen_name}". Review clinical risk before prescribing.`;
    }
    // Same pharmacological class match (e.g. Penicillin allergy & Amoxicillin prescription)
    else if (
      proposedClassInfo &&
      allergenClassInfo &&
      proposedClassInfo.classKey === allergenClassInfo.classKey
    ) {
      matchType = 'same_drug_class';
      reason = `"${proposedMedication}" belongs to the ${proposedClassInfo.classDef.className} class. Patient has a documented allergy to "${allergy.allergen_name}".`;
      recommendation = `High probability of beta-lactam / class cross-reactivity. Review alternative medication class.`;
      alertMessage = "PATIENT ALLERGY ALERT: Potential cross-reactivity detected. Review the patient's allergy history and clinical risk before prescribing.";
    }
    // Cross-reactive classes (e.g. Penicillins and Cephalosporins)
    else if (proposedClassInfo && allergenClassInfo) {
      const crossRule = proposedClassInfo.classDef.crossReactivity.find(
        cr => cr.targetClass === allergenClassInfo.classKey
      ) || allergenClassInfo.classDef.crossReactivity.find(
        cr => cr.targetClass === proposedClassInfo.classKey
      );

      if (crossRule) {
        matchType = 'cross_reactivity_class';
        reason = `Cross-reactivity between ${proposedClassInfo.classDef.className} and ${allergenClassInfo.classDef.className}.`;
        recommendation = `Assess patient allergy history carefully. In severe allergy (anaphylaxis), avoid cross-reactive beta-lactams.`;
        alertMessage = crossRule.message || "PATIENT ALLERGY ALERT: Potential cross-reactivity detected. Review the patient's allergy history and clinical risk before prescribing.";
      }
    }

    if (matchType) {
      const isSevere = allergy.severity === 'anaphylaxis' || allergy.severity === 'severe';
      alerts.push({
        type: 'allergy',
        patientId: patient.id,
        patientName: `${patient.first_name} ${patient.last_name}`,
        proposedMedication,
        recordedAllergen: allergy.allergen_name,
        allergenCategory: allergy.allergen_category,
        reactionDescription: allergy.reaction_description || 'Reaction details unrecorded',
        severity: allergy.severity || 'moderate',
        verificationStatus: allergy.verification_status,
        matchType,
        isSevere,
        alertMessage,
        reason,
        recommendation,
        ruleVersion: CLINICAL_RULE_VERSION
      });
    }
  }

  // 3. Fallback for legacy text notation
  if (alerts.length === 0 && legacyAllergyText) {
    const normLegacy = normalizeName(legacyAllergyText);
    let legacyMatch = false;

    if (normLegacy.includes(normProposed) || normProposed.includes(normLegacy)) {
      legacyMatch = true;
    } else if (proposedClassInfo) {
      for (const member of proposedClassInfo.classDef.members) {
        if (normLegacy.includes(normalizeName(member))) {
          legacyMatch = true;
          break;
        }
      }
    }

    if (legacyMatch) {
      alerts.push({
        type: 'allergy',
        patientId: patient.id,
        patientName: `${patient.first_name} ${patient.last_name}`,
        proposedMedication,
        recordedAllergen: legacyAllergyText,
        allergenCategory: 'drug',
        reactionDescription: 'Historical record notation',
        severity: 'moderate',
        verificationStatus: 'unverified',
        matchType: 'legacy_text_match',
        isSevere: false,
        alertMessage: "PATIENT ALLERGY ALERT: Potential cross-reactivity detected. Review the patient's allergy history and clinical risk before prescribing.",
        reason: `Historical patient chart notes an allergy to: "${legacyAllergyText}".`,
        recommendation: `Verify allergy details with patient before finalizing prescription.`,
        ruleVersion: CLINICAL_RULE_VERSION
      });
    }
  }

  // 4. Drug-Drug Interactions Check
  const drugInteractions = await checkDrugDrugInteractions(patientId, proposedMedication);

  // 5. Categorize alert severity and hard-stop policy
  const hasAllergyConflict = alerts.length > 0;
  const hasDDIConflict = drugInteractions.length > 0;
  const hasConflict = hasAllergyConflict || hasDDIConflict;

  // Hard block: Anaphylactic reaction on exact allergen or same drug class
  const hardBlocked = alerts.some(
    a => (a.severity === 'anaphylaxis' || a.severity === 'severe') &&
         (a.matchType === 'exact_or_active_ingredient' || a.matchType === 'same_drug_class')
  );

  const requiresOverride = hasConflict && !hardBlocked;

  // Missing or unreviewed allergy status handling
  const hasNoDocumentedAllergies = structuredAllergies.length === 0 && !legacyAllergyText;
  const uncertaintyNote = hasNoDocumentedAllergies
    ? 'No documented allergy records on file for this patient. Missing allergy history must be treated as unknown; clinician review is required.'
    : null;

  return {
    safe: !hasConflict,
    hasConflict,
    hardBlocked,
    requiresOverride,
    alerts,
    drugInteractions,
    uncertaintyNote,
    ruleVersion: CLINICAL_RULE_VERSION
  };
}

module.exports = {
  checkMedicationAllergy,
  checkDrugDrugInteractions,
  findDrugClass,
  CLINICAL_DRUG_CLASSES,
  VALIDATED_DRUG_INTERACTIONS,
  CLINICAL_RULE_VERSION
};
