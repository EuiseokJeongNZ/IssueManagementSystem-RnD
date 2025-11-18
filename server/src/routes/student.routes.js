const express = require('express');
const router = express.Router();
const { upsertStudentTeam } = require('../controllers/student.controller');

router.put('/:userId/team', upsertStudentTeam);

module.exports = router;
