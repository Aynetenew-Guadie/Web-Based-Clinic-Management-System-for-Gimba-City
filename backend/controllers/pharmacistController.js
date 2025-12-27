const { Op } = require('sequelize');
const Prescription = require('../models/prescription');
const User = require('../models/user');

// Simple in-memory pharmacy inventory (temporary)
const drugs = [];

module.exports = {
  // Get prescriptions for pharmacist (default: prescriptions with status 'prescribed' or 'ready')
  async getPrescriptions(req, res) {
    try {
      const { status = 'prescribed', page = 1, limit = 20, q } = req.query;
      const offset = (page - 1) * limit;

      console.log(`[PHARMACIST GET] user=${req.user?.id || 'anon'} role=${req.user?.role || 'none'} status=${status} q=${q || ''}`);

      const whereClause = {};
      // Support multiple ways to ask for status (single value, comma-separated, or array)
      // and treat 'prescribed' as including 'active' so recently issued items show up.
      let statuses = null;
      if (status && status !== 'all') {
        if (Array.isArray(status)) {
          statuses = status.map(s => String(s).toLowerCase().trim());
        } else {
          statuses = String(status).split(',').map(s => s.toLowerCase().trim());
        }
        // If 'prescribed' requested, include 'active'
        if (statuses.includes('prescribed') && !statuses.includes('active')) statuses.push('active');
        whereClause.status = { [Op.in]: statuses };
      } else {
        // Default to both prescribed and active
        whereClause.status = { [Op.in]: ['prescribed', 'active'] };
      }

      if (q) {
        whereClause[Op.or] = [
          { medication: { [Op.iLike]: `%${q}%` } },
        ];
      }

      // Primary path: DB-backed query
      try {
        const { count, rows: prescriptions } = await Prescription.findAndCountAll({
          where: whereClause,
          include: [
            { model: User, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'username', 'email'] },
            { model: User, as: 'doctor', attributes: ['id', 'first_name', 'last_name', 'username', 'specialization'] },
            { model: User, as: 'dispenser', attributes: ['id', 'first_name', 'last_name', 'username'] }
          ],
          order: [['dateIssued', 'DESC']],
          limit: parseInt(limit),
          offset: parseInt(offset)
        });

        // Merge DB prescriptions with any in-memory prescriptions (dedupe by id)
        let finalPrescriptions = prescriptions || [];
        let finalCount = count || 0;
        try {
          if (Array.isArray(global.prescriptions) && global.prescriptions.length > 0) {
            console.warn('Merging in-memory prescriptions into pharmacist view (deduping)');
            // Determine desired statuses from whereClause (if set) or default
            const desiredStatuses = Array.isArray(whereClause.status?.[Op.in]) ? whereClause.status[Op.in] : (whereClause.status ? [whereClause.status] : ['prescribed', 'active']);
            const desiredLower = desiredStatuses.map(s => String(s).toLowerCase().trim());

            let memList = global.prescriptions.filter(p => desiredLower.includes((p.status || '').toString().toLowerCase().trim()));
            if (q) memList = memList.filter(p => p.medication && p.medication.toLowerCase().includes(q.toLowerCase()));

            // Enrich memList with patient/doctor info from global.users
            const usersMap = Array.isArray(global.users) ? global.users.reduce((m, u) => { m[u.id] = u; return m; }, {}) : {};
            const enrichedMem = memList.map(p => ({
              ...p,
              patient: usersMap[p.patientId] ? { id: usersMap[p.patientId].id, first_name: usersMap[p.patientId].first_name || usersMap[p.patientId].name || usersMap[p.patientId].username, last_name: usersMap[p.patientId].last_name } : null,
              doctor: usersMap[p.doctorId] ? { id: usersMap[p.doctorId].id, first_name: usersMap[p.doctorId].first_name || usersMap[p.doctorId].name || usersMap[p.doctorId].username, last_name: usersMap[p.doctorId].last_name } : null
            }));

            // Dedupe: prefer DB rows, then append mem ones that are missing
            const dbIds = new Set((finalPrescriptions || []).map(p => String(p.id)));
            const toAdd = enrichedMem.filter(p => !dbIds.has(String(p.id)));

            const combined = [...(finalPrescriptions || []), ...toAdd];
            finalPrescriptions = combined.slice(0, parseInt(limit));
            finalCount = combined.length;
          }
        } catch (mergeErr) {
          console.warn('Failed to merge in-memory prescriptions:', mergeErr);
        }

        return res.json({
          success: true,
          data: {
            prescriptions: finalPrescriptions,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(finalCount / limit),
              totalPrescriptions: finalCount,
              hasNext: page < Math.ceil(finalCount / limit),
              hasPrev: page > 1
            }
          }
        });
      } catch (dbErr) {
        // Fallback to in-memory mock data (server may be running without DB)
        console.warn('DB unavailable for pharmacist prescriptions, using in-memory fallback');

        const globalList = Array.isArray(global.prescriptions) ? global.prescriptions : [];
        let filtered = globalList.filter(p => {
          if (whereClause.status && p.status !== whereClause.status) return false;
          if (q && !p.medication?.toLowerCase().includes(q.toLowerCase())) return false;
          return true;
        });

        const count = filtered.length;
        filtered = filtered.slice(offset, offset + parseInt(limit));

        // Enrich with patient/doctor from global users if available
        const usersMap = Array.isArray(global.users) ? global.users.reduce((m, u) => { m[u.id] = u; return m; }, {}) : {};
        const enriched = filtered.map(p => ({
          ...p,
          patient: usersMap[p.patientId] ? { id: usersMap[p.patientId].id, first_name: usersMap[p.patientId].first_name || usersMap[p.patientId].name || usersMap[p.patientId].username, last_name: usersMap[p.patientId].last_name } : null,
          doctor: usersMap[p.doctorId] ? { id: usersMap[p.doctorId].id, first_name: usersMap[p.doctorId].first_name || usersMap[p.doctorId].name || usersMap[p.doctorId].username, last_name: usersMap[p.doctorId].last_name } : null
        }));

        return res.json({
          success: true,
          data: {
            prescriptions: enriched,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(count / limit),
              totalPrescriptions: count,
              hasNext: page < Math.ceil(count / limit),
              hasPrev: page > 1
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching pharmacist prescriptions:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch prescriptions' });
    }
  },

  // Mark prescription as dispensed
  async dispensePrescription(req, res) {
    try {
      const { prescriptionId } = req.params;
      console.log(`[PHARMACIST DISPENSE] user=${req.user?.id || 'anon'} role=${req.user?.role || 'none'} prescriptionId=${prescriptionId}`);

      // Try DB first
      try {
        const prescription = await Prescription.findOne({ where: { id: prescriptionId } });
        if (!prescription) {
          throw new Error('not_found');
        }

        prescription.status = 'dispensed';
        prescription.dispensed_by = req.user.id;
        prescription.date_dispensed = new Date();
        await prescription.save();

        return res.json({ success: true, message: 'Prescription dispensed', data: prescription });
      } catch (dbErr) {
        // Fallback to in-memory
        if (!Array.isArray(global.prescriptions)) {
          return res.status(500).json({ success: false, error: 'No prescriptions available to update' });
        }

        const idx = global.prescriptions.findIndex(p => String(p.id) === String(prescriptionId));
        if (idx === -1) return res.status(404).json({ success: false, error: 'Prescription not found' });

        global.prescriptions[idx].status = 'dispensed';
        global.prescriptions[idx].dispensed_by = req.user?.id || null;
        global.prescriptions[idx].date_dispensed = new Date().toISOString();

        return res.json({ success: true, message: 'Prescription dispensed (in-memory)', data: global.prescriptions[idx] });
      }
    } catch (error) {
      console.error('Error dispensing prescription:', error);
      res.status(500).json({ success: false, error: 'Failed to dispense prescription' });
    }
  },

  // Get patient details (pharmacist access)
  async getPatient(req, res) {
    try {
      const { patientId } = req.params;
      const patient = await User.findByPk(patientId, { attributes: { exclude: ['password'] } });
      if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
      res.json({ success: true, data: patient });
    } catch (error) {
      console.error('Error fetching patient:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch patient' });
    }
  },

  // Update patient details (pharmacist access)
  async updatePatient(req, res) {
    try {
      const { patientId } = req.params;
      const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'address', 'gender', 'date_of_birth', 'emergency_contact'];
      const updateData = {};

      for (const key of allowedFields) {
        if (req.body[key] !== undefined) updateData[key] = req.body[key];
      }

      const [updatedRows] = await User.update(updateData, { where: { id: patientId } });
      if (!updatedRows) return res.status(404).json({ success: false, error: 'Patient not found or no changes made' });

      const updated = await User.findByPk(patientId, { attributes: { exclude: ['password'] } });
      res.json({ success: true, message: 'Patient updated', data: updated });
    } catch (error) {
      console.error('Error updating patient:', error);
      res.status(500).json({ success: false, error: 'Failed to update patient' });
    }
  },

  // Add a drug to simple inventory (temporary)
  async addDrug(req, res) {
    try {
      const { name, sku, quantity = 0 } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'Drug name is required' });
      const newDrug = { id: drugs.length ? drugs[drugs.length-1].id + 1 : 1, name, sku: sku || null, quantity: parseInt(quantity) };
      drugs.push(newDrug);
      res.status(201).json({ success: true, data: newDrug });
    } catch (error) {
      console.error('Error adding drug:', error);
      res.status(500).json({ success: false, error: 'Failed to add drug' });
    }
  },

  // List drugs (simple inventory)
  async listDrugs(req, res) {
    try {
      res.json({ success: true, data: drugs });
    } catch (error) {
      console.error('Error listing drugs:', error);
      res.status(500).json({ success: false, error: 'Failed to list drugs' });
    }
  }
};