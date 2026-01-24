const router = require('express').Router();
const {createAdminUser, getAllUsers, deleteUser, updateAdminUser, loginAdminUser} = require('./userAdmin.controller');

router.post('/login', loginAdminUser);

router.post('/', createAdminUser);
router.get('/', getAllUsers);
router.delete('/:id', deleteUser);
router.put('/:id', updateAdminUser);

module.exports = router;