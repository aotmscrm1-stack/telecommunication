/**
 * generate_dry_run_report.js
 * Comprehensive read-only dry-run duplicate analysis for Meta Leads in MongoDB.
 * STRICTLY READ-ONLY - ZERO DELETIONS, ZERO MODIFICATIONS.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MetaLead = require('../src/database/models/MetaLead');
const Lead = require('../src/database/models/Lead');

function normalize10DigitPhone(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(-10);
  if (digits.length > 10) return digits.slice(-10);
  return digits.length >= 7 ? digits : '';
}

function extractIdAndPhone(doc) {
  const rd = doc.rawData || {};
  let id = doc.metaLeadId || rd.id || rd.lead_id;
  if (!id) {
    const mangledKey = Object.keys(rd).find(k => k.startsWith('l:'));
    if (mangledKey && rd[mangledKey] && String(rd[mangledKey]).startsWith('l:')) {
      id = String(rd[mangledKey]).trim();
    }
  }

  let phone = doc.phone || doc.normalizedPhone || rd.phone_number || rd.phone || rd.mobile;
  if (!phone) {
    const mangledKey = Object.keys(rd).find(k => k.startsWith('p:'));
    if (mangledKey && rd[mangledKey]) {
      phone = String(rd[mangledKey]).trim();
    }
  }

  const normalizedPhone = normalize10DigitPhone(phone);
  return { id: id || null, normalizedPhone: normalizedPhone || null };
}

async function runDryRunReport() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB (Read-Only Mode)');

  const totalMetaLeads = await MetaLead.countDocuments();
  const allDocs = await MetaLead.find({}).sort({ createdAt: 1 }).lean();

  console.log(`Analyzing ${allDocs.length} total MetaLead documents...`);

  // Group by Campaign + Meta Lead ID (primary) or Campaign + Normalized Phone (secondary)
  const groups = {};

  allDocs.forEach(doc => {
    const { id, normalizedPhone } = extractIdAndPhone(doc);
    const primaryKey = id 
      ? `${doc.campaign}__id__${id}`
      : (normalizedPhone ? `${doc.campaign}__phone__${normalizedPhone}` : `${doc.campaign}__doc__${doc._id}`);

    if (!groups[primaryKey]) {
      groups[primaryKey] = {
        campaign: doc.campaign,
        identifier: id || (normalizedPhone ? `Phone: ${normalizedPhone.slice(0, 3)}****${normalizedPhone.slice(-3)}` : `DocID: ${doc._id}`),
        docs: []
      };
    }
    groups[primaryKey].docs.push(doc);
  });

  const duplicateGroups = Object.values(groups).filter(g => g.docs.length > 1);
  const uniqueGroups = Object.values(groups).filter(g => g.docs.length === 1);

  let totalRetained = 0;
  let totalProposedForRemoval = 0;
  const removalDetails = [];

  duplicateGroups.forEach(g => {
    // Sort chronologically (earliest first)
    g.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Earliest record is retained
    const retainedRecord = g.docs[0];
    totalRetained++;

    // Subsequent records are proposed for removal
    const duplicatesToRemove = g.docs.slice(1);
    totalProposedForRemoval += duplicatesToRemove.length;

    // Check if any duplicate has special CRM status or conversion
    const hasConverted = g.docs.some(d => d.status === 'Converted' || !!d.crmLeadId);
    const nonNewStatuses = g.docs.map(d => d.status).filter(s => s && s !== 'New');

    removalDetails.push({
      campaign: g.campaign,
      identifier: g.identifier,
      totalCopies: g.docs.length,
      retainedDocId: retainedRecord._id,
      retainedCreatedAt: retainedRecord.createdAt,
      removalDocIds: duplicatesToRemove.map(d => d._id),
      hasConverted,
      statusesFound: Array.from(new Set(nonNewStatuses))
    });
  });

  totalRetained += uniqueGroups.length;

  console.log('\n======================================================');
  console.log('       META LEADS CLEANUP DRY-RUN AUDIT REPORT        ');
  console.log('======================================================');
  console.log(`Total MetaLead documents in MongoDB:      ${totalMetaLeads}`);
  console.log(`Unique leads identified:                  ${totalRetained}`);
  console.log(`Duplicate groups identified:              ${duplicateGroups.length}`);
  console.log(`Duplicate documents proposed for removal: ${totalProposedForRemoval}`);
  console.log(`Verified resulting total after cleanup:   ${totalRetained} docs`);
  console.log('======================================================\n');

  console.log('Campaign Breakdown of Duplicates:');
  const campaignSummary = {};
  duplicateGroups.forEach(g => {
    campaignSummary[g.campaign] = (campaignSummary[g.campaign] || 0) + (g.docs.length - 1);
  });
  console.log(campaignSummary);

  console.log('\nSample 10 Duplicate Groups Proposed for Cleanup:');
  removalDetails.slice(0, 10).forEach((item, idx) => {
    console.log(`\nGroup ${idx + 1}: [${item.campaign}] ${item.identifier}`);
    console.log(`  Copies found: ${item.totalCopies}x`);
    console.log(`  RETAIN (Earliest): ${item.retainedDocId} (Created: ${item.retainedCreatedAt})`);
    console.log(`  PROPOSED REMOVAL: ${item.removalDocIds.join(', ')}`);
    if (item.hasConverted || item.statusesFound.length > 0) {
      console.log(`  * NOTE: CRM status found (${item.statusesFound.join(', ')}). Values will be merged into retained record.`);
    }
  });

  console.log('\n[CONFIRMATION] ZERO RECORDS WERE DELETED OR MODIFIED.');
  console.log('[CONFIRMATION] All duplicate records remain untouched pending user approval.\n');

  process.exit(0);
}

runDryRunReport().catch(err => {
  console.error(err);
  process.exit(1);
});
