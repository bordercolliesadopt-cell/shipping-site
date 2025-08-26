const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const shipmentsController = require('../controllers/shipmentsController');
const statusesController = require('../controllers/statusesController');
const settingsController = require('../controllers/settingsController');
const usersController = require('../controllers/usersController');
const notificationsController = require('../controllers/notificationsController');

function ensureAuth(req, res, next) {
	if (req.session && req.session.adminUser) return next();
	return res.redirect('/admin/login');
}

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.post('/logout', ensureAuth, authController.postLogout);

router.get('/', ensureAuth, dashboardController.index);

router.get('/shipments', ensureAuth, shipmentsController.index);
router.get('/shipments/new', ensureAuth, shipmentsController.newForm);
router.post('/shipments', ensureAuth, shipmentsController.create);
router.get('/shipments/:id', ensureAuth, shipmentsController.show);
router.get('/shipments/:id/edit', ensureAuth, shipmentsController.editForm);
router.put('/shipments/:id', ensureAuth, shipmentsController.update);
router.delete('/shipments/:id', ensureAuth, shipmentsController.destroy);
router.post('/shipments/:id/status', ensureAuth, shipmentsController.addStatus);

router.get('/statuses', ensureAuth, statusesController.index);
router.get('/statuses/new', ensureAuth, statusesController.newForm);
router.post('/statuses', ensureAuth, statusesController.create);
router.get('/statuses/:id/edit', ensureAuth, statusesController.editForm);
router.put('/statuses/:id', ensureAuth, statusesController.update);
router.delete('/statuses/:id', ensureAuth, statusesController.destroy);

router.get('/settings', ensureAuth, settingsController.index);
router.post('/settings', ensureAuth, settingsController.update);
router.post('/settings/test-smtp', ensureAuth, settingsController.testSmtp);

router.get('/users', ensureAuth, usersController.index);
router.get('/users/new', ensureAuth, usersController.newForm);
router.post('/users', ensureAuth, usersController.create);
router.get('/users/:id/edit', ensureAuth, usersController.editForm);
router.put('/users/:id', ensureAuth, usersController.update);
router.delete('/users/:id', ensureAuth, usersController.destroy);

// Notification routes
router.get('/notifications', ensureAuth, notificationsController.getNotifications);
router.post('/notifications/:id/read', ensureAuth, notificationsController.markAsRead);
router.post('/notifications/mark-all-read', ensureAuth, notificationsController.markAllAsRead);
router.delete('/notifications/:id', ensureAuth, notificationsController.deleteNotification);

module.exports = router;
